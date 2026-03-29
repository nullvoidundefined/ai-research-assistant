import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  chatHandler,
  createConversationHandler,
  deleteConversationHandler,
  getConversationHandler,
  getConversationsHandler,
} from './chat.js';

const mockHandleChatStream = vi.fn();
const mockGetUserConversations = vi.fn();
const mockCreateConversation = vi.fn();
const mockGetConversationById = vi.fn();
const mockDeleteConversation = vi.fn();
const mockGetConversationMessages = vi.fn();

vi.mock('app/services/chat.service.js', () => ({
  handleChatStream: (...args: unknown[]) => mockHandleChatStream(...args),
}));

vi.mock('app/repositories/conversations/conversations.js', () => ({
  getUserConversations: (...args: unknown[]) =>
    mockGetUserConversations(...args),
  createConversation: (...args: unknown[]) => mockCreateConversation(...args),
  getConversationById: (...args: unknown[]) => mockGetConversationById(...args),
  deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
}));

vi.mock('app/repositories/messages/messages.js', () => ({
  getConversationMessages: (...args: unknown[]) =>
    mockGetConversationMessages(...args),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function makeReq(body = {}, params = {}, sessionUserId = 'user-1'): Request {
  return {
    body,
    params,
    session: { userId: sessionUserId },
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('chatHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid body', async () => {
    const req = makeReq({ message: '' });
    const res = makeRes();
    await expect(chatHandler(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws VALIDATION_ERROR when conversationId is not a UUID', async () => {
    const req = makeReq({ message: 'Hello', conversationId: 'not-uuid' });
    const res = makeRes();
    await expect(chatHandler(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('calls handleChatStream for valid input', async () => {
    mockHandleChatStream.mockResolvedValue(undefined);
    const req = makeReq({
      message: 'Hello',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const res = makeRes();
    await chatHandler(req, res);
    expect(mockHandleChatStream).toHaveBeenCalledWith(
      'user-1',
      'Hello',
      '550e8400-e29b-41d4-a716-446655440000',
      undefined,
      res,
    );
  });
});

describe('getConversationsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns conversations', async () => {
    const conversations = [{ id: 'c1', title: 'Test' }];
    mockGetUserConversations.mockResolvedValue(conversations);

    const req = makeReq();
    const res = makeRes();
    await getConversationsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ conversations });
  });
});

describe('createConversationHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a conversation', async () => {
    const conv = { id: 'c1', user_id: 'user-1' };
    mockCreateConversation.mockResolvedValue(conv);

    const req = makeReq({});
    const res = makeRes();
    await createConversationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ conversation: conv });
  });
});

describe('getConversationHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when conversation not found', async () => {
    mockGetConversationById.mockResolvedValue(null);

    const req = makeReq({}, { id: 'nonexistent' });
    const res = makeRes();
    await expect(getConversationHandler(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns conversation with messages', async () => {
    const conv = { id: 'c1' };
    const messages = [{ id: 'm1', content: 'Hello' }];
    mockGetConversationById.mockResolvedValue(conv);
    mockGetConversationMessages.mockResolvedValue(messages);

    const req = makeReq({}, { id: 'c1' });
    const res = makeRes();
    await getConversationHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ conversation: conv, messages });
  });
});

describe('deleteConversationHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when conversation not found', async () => {
    mockDeleteConversation.mockResolvedValue(false);

    const req = makeReq({}, { id: 'nonexistent' });
    const res = makeRes();
    await expect(deleteConversationHandler(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns success message on delete', async () => {
    mockDeleteConversation.mockResolvedValue(true);

    const req = makeReq({}, { id: 'c1' });
    const res = makeRes();
    await deleteConversationHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Conversation deleted' });
  });
});
