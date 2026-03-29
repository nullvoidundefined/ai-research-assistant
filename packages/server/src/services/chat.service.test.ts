import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleChatStream } from './chat.service.js';

const {
  mockMessagesCreate,
  mockMessagesStream,
  mockEmbed,
  mockVectorSearch,
  mockGetConversationById,
  mockGetConversationMessages,
  mockSaveMessage,
  mockQueueAdd,
} = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
  mockMessagesStream: vi.fn(),
  mockEmbed: vi.fn(),
  mockVectorSearch: vi.fn(),
  mockGetConversationById: vi.fn(),
  mockGetConversationMessages: vi.fn(),
  mockSaveMessage: vi.fn(),
  mockQueueAdd: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mockMessagesCreate,
      stream: mockMessagesStream,
    };
  }
  return { default: MockAnthropic };
});

vi.mock('app/services/embedding.service.js', () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

vi.mock('app/repositories/chunks/chunks.js', () => ({
  vectorSearch: (...args: unknown[]) => mockVectorSearch(...args),
}));

vi.mock('app/repositories/conversations/conversations.js', () => ({
  getConversationById: (...args: unknown[]) => mockGetConversationById(...args),
}));

vi.mock('app/repositories/messages/messages.js', () => ({
  getConversationMessages: (...args: unknown[]) =>
    mockGetConversationMessages(...args),
  saveMessage: (...args: unknown[]) => mockSaveMessage(...args),
}));

vi.mock('app/config/bullmq.js', () => ({
  conversationTitleQueue: {
    add: (...args: unknown[]) => mockQueueAdd(...args),
  },
  sourceIngestQueue: { add: vi.fn() },
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function createMockRes(): Response & { writtenData: string[] } {
  const writtenData: string[] = [];
  return {
    writtenData,
    setHeader: vi.fn(),
    write: vi.fn((data: string) => {
      writtenData.push(data);
      return true;
    }),
    end: vi.fn(),
  } as unknown as Response & { writtenData: string[] };
}

describe('handleChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends error when conversation not found', async () => {
    mockGetConversationById.mockResolvedValue(null);

    const res = createMockRes();
    await handleChatStream('user-1', 'Hello', 'conv-1', undefined, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    const errorEvent = res.writtenData.find((d) =>
      d.includes('"type":"error"'),
    );
    expect(errorEvent).toBeTruthy();
    expect(res.end).toHaveBeenCalled();
  });

  it('streams tokens and sends citations for a valid conversation', async () => {
    mockGetConversationById.mockResolvedValue({
      id: 'conv-1',
      user_id: 'user-1',
    });
    mockGetConversationMessages.mockResolvedValue([]);
    mockEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockVectorSearch.mockResolvedValue([
      {
        id: 'chunk-1',
        content: 'Relevant content about AI',
        source_id: 's1',
        chunk_index: 0,
        title: 'AI Article',
        url: 'https://example.com/ai',
      },
    ]);

    const streamEvents = [
      {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Based on ' },
      },
      {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: '[1] the answer is AI.' },
      },
    ];

    mockMessagesStream.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        for (const event of streamEvents) {
          yield event;
        }
      },
    });

    mockSaveMessage
      .mockResolvedValueOnce({ id: 'msg-user-1' })
      .mockResolvedValueOnce({ id: 'msg-assistant-1' });

    const res = createMockRes();
    await handleChatStream('user-1', 'What is AI?', 'conv-1', undefined, res);

    const tokenEvents = res.writtenData.filter((d) =>
      d.includes('"type":"token"'),
    );
    expect(tokenEvents.length).toBeGreaterThan(0);

    const citationEvent = res.writtenData.find((d) =>
      d.includes('"type":"citations"'),
    );
    expect(citationEvent).toBeTruthy();

    const doneEvent = res.writtenData.find((d) => d.includes('"type":"done"'));
    expect(doneEvent).toBeTruthy();

    expect(mockSaveMessage).toHaveBeenCalledTimes(2);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'generate-title',
      expect.any(Object),
    );
  });

  it('does not trigger title generation for non-first exchange', async () => {
    mockGetConversationById.mockResolvedValue({
      id: 'conv-1',
      user_id: 'user-1',
    });
    mockGetConversationMessages.mockResolvedValue([
      { role: 'user', content: 'Previous msg', token_count: 10 },
      { role: 'assistant', content: 'Previous reply', token_count: 15 },
    ]);
    mockEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockVectorSearch.mockResolvedValue([]);
    mockMessagesStream.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Answer' },
        };
      },
    });
    mockSaveMessage
      .mockResolvedValueOnce({ id: 'msg-u' })
      .mockResolvedValueOnce({ id: 'msg-a' });

    const res = createMockRes();
    await handleChatStream('user-1', 'Follow up', 'conv-1', undefined, res);

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles stream error gracefully', async () => {
    mockGetConversationById.mockResolvedValue({
      id: 'conv-1',
      user_id: 'user-1',
    });
    mockGetConversationMessages.mockResolvedValue([]);
    mockEmbed.mockRejectedValue(new Error('Embedding API down'));

    const res = createMockRes();
    await handleChatStream('user-1', 'Test', 'conv-1', undefined, res);

    const errorEvent = res.writtenData.find((d) =>
      d.includes('"type":"error"'),
    );
    expect(errorEvent).toBeTruthy();
    expect(res.end).toHaveBeenCalled();
  });
});
