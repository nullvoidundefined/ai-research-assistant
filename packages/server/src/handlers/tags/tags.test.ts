import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { ApiError } from 'app/utils/ApiError.js';

const mockGetUserTags = vi.fn();
const mockCreateTag = vi.fn();
const mockDeleteTag = vi.fn();

vi.mock('app/repositories/tags/tags.js', () => ({
  getUserTags: (...args: unknown[]) => mockGetUserTags(...args),
  createTag: (...args: unknown[]) => mockCreateTag(...args),
  deleteTag: (...args: unknown[]) => mockDeleteTag(...args),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  getTagsHandler,
  createTagHandler,
  deleteTagHandler,
} from './tags.js';

function makeReq(body = {}, params: Record<string, string> = {}): Request {
  return {
    body,
    params,
    session: { userId: 'user-1' },
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('getTagsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user tags', async () => {
    const tags = [{ id: 't1', name: 'AI' }];
    mockGetUserTags.mockResolvedValue(tags);

    const res = makeRes();
    await getTagsHandler(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ tags });
  });
});

describe('createTagHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid input', async () => {
    const res = makeRes();
    await expect(
      createTagHandler(makeReq({ name: '' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('creates and returns tag', async () => {
    const tag = { id: 't1', name: 'AI', color: '#3b82f6' };
    mockCreateTag.mockResolvedValue(tag);

    const res = makeRes();
    await createTagHandler(makeReq({ name: 'AI' }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tag });
  });

  it('rejects name exceeding 100 characters', async () => {
    const res = makeRes();
    await expect(
      createTagHandler(makeReq({ name: 'a'.repeat(101) }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('deleteTagHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when tag not found', async () => {
    mockDeleteTag.mockResolvedValue(false);
    const res = makeRes();
    await expect(
      deleteTagHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns success on delete', async () => {
    mockDeleteTag.mockResolvedValue(true);
    const res = makeRes();
    await deleteTagHandler(makeReq({}, { id: 't1' }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Tag deleted' });
  });
});
