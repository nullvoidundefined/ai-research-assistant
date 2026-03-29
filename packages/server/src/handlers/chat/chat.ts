import {
  createConversation,
  deleteConversation,
  getConversationById,
  getUserConversations,
} from 'app/repositories/conversations/conversations.js';
import { getConversationMessages } from 'app/repositories/messages/messages.js';
import { handleChatStream } from 'app/services/chat.service.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { Request, Response } from 'express';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid(),
  collectionId: z.string().uuid().optional(),
});

export async function chatHandler(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  const { message, conversationId, collectionId } = parsed.data;
  await handleChatStream(userId, message, conversationId, collectionId, res);
}

export async function getConversationsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  try {
    const conversations = await getUserConversations(userId);
    res.json({ conversations });
  } catch (err) {
    logger.error({ err }, 'Get conversations failed');
    throw ApiError.internal('Failed to get conversations');
  }
}

export async function createConversationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { collectionId } = req.body;
  try {
    const conversation = await createConversation(userId, collectionId);
    res.status(201).json({ conversation });
  } catch (err) {
    logger.error({ err }, 'Create conversation failed');
    throw ApiError.internal('Failed to create conversation');
  }
}

export async function getConversationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const conversation = await getConversationById(id, userId);
    if (!conversation) {
      throw ApiError.notFound('Conversation not found');
    }
    const messages = await getConversationMessages(id);
    res.json({ conversation, messages });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Get conversation failed');
    throw ApiError.internal('Failed to get conversation');
  }
}

export async function deleteConversationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const deleted = await deleteConversation(id, userId);
    if (!deleted) {
      throw ApiError.notFound('Conversation not found');
    }
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Delete conversation failed');
    throw ApiError.internal('Failed to delete conversation');
  }
}
