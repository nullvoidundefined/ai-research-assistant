import Anthropic from '@anthropic-ai/sdk';
import type { CitationInfo } from '@research/common';
import { conversationTitleQueue } from 'app/config/bullmq.js';
import {
  buildContextBlock,
  buildQASystemPrompt,
} from 'app/prompts/qa-system.js';
import { vectorSearch } from 'app/repositories/chunks/chunks.js';
import { getConversationById } from 'app/repositories/conversations/conversations.js';
import {
  getConversationMessages,
  saveMessage,
} from 'app/repositories/messages/messages.js';
import { embed } from 'app/services/embedding.service.js';
import { logger } from 'app/utils/logs/logger.js';
import type { Response } from 'express';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sseWrite(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function handleChatStream(
  userId: string,
  message: string,
  conversationId: string,
  collectionId: string | undefined,
  res: Response,
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    // Validate conversation
    const conversation = await getConversationById(conversationId, userId);
    if (!conversation) {
      sseWrite(res, { type: 'error', error: 'Conversation not found' });
      res.end();
      return;
    }

    // Load recent message history
    const history = await getConversationMessages(conversationId, 10);

    // Summarize if too many tokens
    let historyContent: Array<{ role: 'user' | 'assistant'; content: string }> =
      history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const totalTokens = history.reduce((sum, m) => sum + m.token_count, 0);
    if (totalTokens > 8000 && history.length > 4) {
      const olderMessages = history.slice(0, -4);
      const recentMessages = history.slice(-4);

      const summaryResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation history concisely:\n\n${olderMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')}`,
          },
        ],
      });

      const summary =
        summaryResponse.content[0].type === 'text'
          ? summaryResponse.content[0].text
          : '';

      historyContent = [
        {
          role: 'user',
          content: `[Previous conversation summary: ${summary}]`,
        },
        { role: 'assistant', content: 'I understand the context.' },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
    }

    // Embed the question
    const [queryEmbedding] = await embed([message], 'query');

    // Vector search
    const chunks = await vectorSearch(userId, queryEmbedding, collectionId);

    // Build context
    const contextBlock = buildContextBlock(chunks);
    const systemPrompt = buildQASystemPrompt();

    const userMessageWithContext =
      chunks.length > 0
        ? `Here are relevant source excerpts:\n\n${contextBlock}\n\nUser question: ${message}`
        : message;

    // Stream Anthropic response
    let fullResponse = '';

    const stream = anthropic.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...historyContent,
        { role: 'user', content: userMessageWithContext },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const token = event.delta.text;
        fullResponse += token;
        sseWrite(res, { type: 'token', token });
      }
    }

    // Parse citations
    const citationPattern = /\[(\d+)\]/g;
    const citedIndices = new Set<number>();
    let match;
    while ((match = citationPattern.exec(fullResponse)) !== null) {
      citedIndices.add(parseInt(match[1], 10));
    }

    const citations: CitationInfo[] = [];
    for (const idx of citedIndices) {
      const chunk = chunks[idx - 1];
      if (chunk) {
        citations.push({
          index: idx,
          chunkId: chunk.id,
          content: chunk.content,
          sourceTitle: chunk.title,
          sourceUrl: chunk.url,
        });
      }
    }

    sseWrite(res, { type: 'citations', citations });

    // Save messages
    const userMsg = await saveMessage(
      conversationId,
      'user',
      message,
      [],
      Math.ceil(message.length / 4),
    );
    const citedChunkIds = citations.map((c) => c.chunkId);
    const assistantMsg = await saveMessage(
      conversationId,
      'assistant',
      fullResponse,
      citedChunkIds,
      Math.ceil(fullResponse.length / 4),
    );

    // Enqueue title generation if first exchange
    const isFirstExchange = history.length === 0;
    if (isFirstExchange) {
      await conversationTitleQueue.add('generate-title', {
        conversationId,
        firstMessage: message,
        firstResponse: fullResponse,
      });
    }

    sseWrite(res, {
      type: 'done',
      conversationId,
      messageId: assistantMsg.id,
    });
  } catch (err) {
    logger.error({ err }, 'Chat stream error');
    sseWrite(res, { type: 'error', error: 'Chat failed' });
  } finally {
    res.end();
  }
}
