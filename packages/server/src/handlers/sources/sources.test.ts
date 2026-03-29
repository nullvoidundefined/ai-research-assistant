import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { ApiError } from 'app/utils/ApiError.js';

const mockCreateSource = vi.fn();
const mockGetSourceById = vi.fn();
const mockGetUserSources = vi.fn();
const mockDeleteSource = vi.fn();
const mockUpdateSourceStatus = vi.fn();

vi.mock('app/repositories/sources/sources.js', () => ({
  createSource: (...args: unknown[]) => mockCreateSource(...args),
  getSourceById: (...args: unknown[]) => mockGetSourceById(...args),
  getUserSources: (...args: unknown[]) => mockGetUserSources(...args),
  deleteSource: (...args: unknown[]) => mockDeleteSource(...args),
  updateSourceStatus: (...args: unknown[]) => mockUpdateSourceStatus(...args),
}));

const mockQueueAdd = vi.fn();
vi.mock('app/config/bullmq.js', () => ({
  sourceIngestQueue: { add: (...args: unknown[]) => mockQueueAdd(...args) },
}));

const mockUploadFile = vi.fn();
const mockDeleteFile = vi.fn();
vi.mock('app/services/r2.service.js', () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

vi.mock('app/repositories/tags/tags.js', () => ({
  addTagToSource: vi.fn(),
  removeTagFromSource: vi.fn(),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

import {
  createSourceHandler,
  getSourcesHandler,
  getSourceHandler,
  deleteSourceHandler,
  reprocessSourceHandler,
} from './sources.js';

function makeReq(
  body = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  file?: unknown,
): Request {
  return {
    body,
    params,
    query,
    file,
    session: { userId: 'user-1' },
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('createSourceHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid type', async () => {
    const res = makeRes();
    await expect(
      createSourceHandler(makeReq({ type: 'invalid' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('creates url source and enqueues ingest', async () => {
    const source = { id: 's1', type: 'url', url: 'https://example.com' };
    mockCreateSource.mockResolvedValue(source);
    mockQueueAdd.mockResolvedValue(undefined);

    const res = makeRes();
    await createSourceHandler(
      makeReq({ type: 'url', url: 'https://example.com' }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreateSource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'url', url: 'https://example.com' }),
    );
    expect(mockQueueAdd).toHaveBeenCalledWith('ingest', {
      sourceId: 's1',
      userId: 'user-1',
    });
  });

  it('creates note source', async () => {
    const source = { id: 's2', type: 'note' };
    mockCreateSource.mockResolvedValue(source);
    mockQueueAdd.mockResolvedValue(undefined);

    const res = makeRes();
    await createSourceHandler(
      makeReq({ type: 'note', content: 'My note' }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreateSource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'note', summary: 'My note' }),
    );
  });

  it('throws VALIDATION_ERROR when url type has no url', async () => {
    const res = makeRes();
    await expect(
      createSourceHandler(makeReq({ type: 'url' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws VALIDATION_ERROR when note type has no content', async () => {
    const res = makeRes();
    await expect(
      createSourceHandler(makeReq({ type: 'note' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws VALIDATION_ERROR when pdf type has no file', async () => {
    const res = makeRes();
    await expect(
      createSourceHandler(makeReq({ type: 'pdf' }), res),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('getSourcesHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user sources', async () => {
    const sources = [{ id: 's1' }];
    mockGetUserSources.mockResolvedValue(sources);

    const res = makeRes();
    await getSourcesHandler(makeReq({}, {}, {}), res);

    expect(res.json).toHaveBeenCalledWith({ sources });
  });

  it('passes filter params', async () => {
    mockGetUserSources.mockResolvedValue([]);

    const res = makeRes();
    await getSourcesHandler(
      makeReq({}, {}, { type: 'url', status: 'ready' }),
      res,
    );

    expect(mockGetUserSources).toHaveBeenCalledWith('user-1', {
      type: 'url',
      status: 'ready',
      search: undefined,
      collectionId: undefined,
      tagId: undefined,
    });
  });
});

describe('getSourceHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when source not found', async () => {
    mockGetSourceById.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      getSourceHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns source when found', async () => {
    const source = { id: 's1', title: 'Test' };
    mockGetSourceById.mockResolvedValue(source);

    const res = makeRes();
    await getSourceHandler(makeReq({}, { id: 's1' }), res);

    expect(res.json).toHaveBeenCalledWith({ source });
  });
});

describe('deleteSourceHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when source not found', async () => {
    mockGetSourceById.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      deleteSourceHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('deletes source and cleans up R2 file', async () => {
    const source = { id: 's1', r2_key: 'files/test.pdf' };
    mockGetSourceById.mockResolvedValue(source);
    mockDeleteSource.mockResolvedValue(true);
    mockDeleteFile.mockResolvedValue(undefined);

    const res = makeRes();
    await deleteSourceHandler(makeReq({}, { id: 's1' }), res);

    expect(mockDeleteFile).toHaveBeenCalledWith('files/test.pdf');
    expect(res.json).toHaveBeenCalledWith({ message: 'Source deleted' });
  });
});

describe('reprocessSourceHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when source not found', async () => {
    mockGetSourceById.mockResolvedValue(null);
    const res = makeRes();
    await expect(
      reprocessSourceHandler(makeReq({}, { id: 'nope' }), res),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('resets status and enqueues ingest', async () => {
    mockGetSourceById.mockResolvedValue({ id: 's1' });
    mockUpdateSourceStatus.mockResolvedValue(undefined);
    mockQueueAdd.mockResolvedValue(undefined);

    const res = makeRes();
    await reprocessSourceHandler(makeReq({}, { id: 's1' }), res);

    expect(mockUpdateSourceStatus).toHaveBeenCalledWith('s1', 'pending');
    expect(mockQueueAdd).toHaveBeenCalledWith('ingest', {
      sourceId: 's1',
      userId: 'user-1',
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Source reprocessing started',
    });
  });
});
