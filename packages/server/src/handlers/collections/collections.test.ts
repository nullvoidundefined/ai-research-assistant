import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addSourceToCollectionHandler,
  createCollectionHandler,
  deleteCollectionHandler,
  getCollectionHandler,
  getCollectionsHandler,
  getPublicCollection,
  shareCollectionHandler,
} from './collections.js';

const mockGetUserCollections = vi.fn();
const mockCreateCollection = vi.fn();
const mockGetCollectionById = vi.fn();
const mockUpdateCollection = vi.fn();
const mockDeleteCollection = vi.fn();
const mockAddSourceToCollection = vi.fn();
const mockRemoveSourceFromCollection = vi.fn();
const mockSetShareToken = vi.fn();
const mockGetCollectionByShareToken = vi.fn();
const mockGetCollectionSources = vi.fn();

vi.mock('app/repositories/collections/collections.js', () => ({
  getUserCollections: (...args: unknown[]) => mockGetUserCollections(...args),
  createCollection: (...args: unknown[]) => mockCreateCollection(...args),
  getCollectionById: (...args: unknown[]) => mockGetCollectionById(...args),
  updateCollection: (...args: unknown[]) => mockUpdateCollection(...args),
  deleteCollection: (...args: unknown[]) => mockDeleteCollection(...args),
  addSourceToCollection: (...args: unknown[]) =>
    mockAddSourceToCollection(...args),
  removeSourceFromCollection: (...args: unknown[]) =>
    mockRemoveSourceFromCollection(...args),
  setShareToken: (...args: unknown[]) => mockSetShareToken(...args),
  getCollectionByShareToken: (...args: unknown[]) =>
    mockGetCollectionByShareToken(...args),
  getCollectionSources: (...args: unknown[]) =>
    mockGetCollectionSources(...args),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function makeReq(
  body = {},
  params: Record<string, string> = {},
  sessionUserId = 'user-1',
): Request {
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

describe('getCollectionsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns collections for user', async () => {
    const collections = [{ id: 'col-1', name: 'Research' }];
    mockGetUserCollections.mockResolvedValue(collections);

    const res = makeRes();
    await getCollectionsHandler(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ collections });
  });
});

describe('createCollectionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid input', async () => {
    const res = makeRes();
    await expect(
      createCollectionHandler(makeReq({ name: '' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('creates and returns collection', async () => {
    const col = { id: 'col-1', name: 'New Collection' };
    mockCreateCollection.mockResolvedValue(col);

    const res = makeRes();
    await createCollectionHandler(makeReq({ name: 'New Collection' }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ collection: col });
  });
});

describe('getCollectionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when not found', async () => {
    mockGetCollectionById.mockResolvedValue(null);

    const res = makeRes();
    await expect(
      getCollectionHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns collection with sources', async () => {
    const col = { id: 'col-1' };
    const sources = [{ id: 's1' }];
    mockGetCollectionById.mockResolvedValue(col);
    mockGetCollectionSources.mockResolvedValue(sources);

    const res = makeRes();
    await getCollectionHandler(makeReq({}, { id: 'col-1' }), res);

    expect(res.json).toHaveBeenCalledWith({ collection: col, sources });
  });
});

describe('deleteCollectionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when not found', async () => {
    mockDeleteCollection.mockResolvedValue(false);
    const res = makeRes();
    await expect(
      deleteCollectionHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns success on delete', async () => {
    mockDeleteCollection.mockResolvedValue(true);
    const res = makeRes();
    await deleteCollectionHandler(makeReq({}, { id: 'col-1' }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Collection deleted' });
  });
});

describe('addSourceToCollectionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR when sourceId missing', async () => {
    const res = makeRes();
    await expect(
      addSourceToCollectionHandler(makeReq({}, { id: 'col-1' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws NOT_FOUND when collection not found', async () => {
    mockGetCollectionById.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      addSourceToCollectionHandler(
        makeReq({ sourceId: 's1' }, { id: 'col-1' }),
        res,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('adds source to collection', async () => {
    mockGetCollectionById.mockResolvedValue({ id: 'col-1' });
    mockAddSourceToCollection.mockResolvedValue(undefined);

    const res = makeRes();
    await addSourceToCollectionHandler(
      makeReq({ sourceId: 's1' }, { id: 'col-1' }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith({
      message: 'Source added to collection',
    });
  });
});

describe('shareCollectionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when collection not found', async () => {
    mockGetCollectionById.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      shareCollectionHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('generates share token and returns shareUrl', async () => {
    mockGetCollectionById.mockResolvedValue({ id: 'col-1' });
    const updated = { id: 'col-1', share_token: 'abc123', is_public: true };
    mockSetShareToken.mockResolvedValue(updated);

    const res = makeRes();
    await shareCollectionHandler(makeReq({}, { id: 'col-1' }), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: updated,
        shareUrl: expect.stringContaining('/share/'),
      }),
    );
  });
});

describe('getPublicCollection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND for invalid token', async () => {
    mockGetCollectionByShareToken.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      getPublicCollection(makeReq({}, { token: 'invalid' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns public collection with sources', async () => {
    const col = { id: 'col-1' };
    const sources = [{ id: 's1' }];
    mockGetCollectionByShareToken.mockResolvedValue(col);
    mockGetCollectionSources.mockResolvedValue(sources);

    const res = makeRes();
    await getPublicCollection(makeReq({}, { token: 'valid-token' }), res);

    expect(res.json).toHaveBeenCalledWith({ collection: col, sources });
  });
});
