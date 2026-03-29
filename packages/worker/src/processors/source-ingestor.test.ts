import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  messagesCreate: vi.fn(),
  voyageEmbed: vi.fn(),
}));

vi.mock('app/db/pool/pool.js', () => ({
  query: (...args: unknown[]) => mocks.query(...args),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: (...args: unknown[]) => mocks.messagesCreate(...args) };
  }
  return { default: MockAnthropic };
});

vi.mock('voyageai', () => {
  class MockVoyageAIClient {
    embed(...args: unknown[]) {
      return mocks.voyageEmbed(...args);
    }
  }
  return {
    default: { VoyageAIClient: MockVoyageAIClient },
  };
});

vi.mock('app/utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { processSourceIngest } from './source-ingestor.js';

describe('processSourceIngest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when source not found', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      processSourceIngest({ sourceId: 'missing', userId: 'u1' }),
    ).rejects.toThrow('Source missing not found');
  });

  it('processes a note source end-to-end', async () => {
    // SELECT source
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 's1',
          type: 'note',
          url: null,
          r2_key: null,
          summary: 'This is a short note about AI research.',
        },
      ],
    });

    // UPDATE status to fetching
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to chunking
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Metadata extraction
    mocks.messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '{"title": "AI Research Note", "author": null, "publishedDate": null, "summary": "A note about AI."}',
        },
      ],
    });

    // UPDATE metadata
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to embedding
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Generate embeddings
    mocks.voyageEmbed.mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    // DELETE old chunks
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // INSERT chunk
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to ready
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await processSourceIngest({ sourceId: 's1', userId: 'u1' });

    // Verify status transitions
    const updateCalls = mocks.query.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('UPDATE sources SET status'),
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);

    // Verify embeddings were generated
    expect(mocks.voyageEmbed).toHaveBeenCalled();
  });

  it('sets status to failed when content extraction fails for url source', async () => {
    // SELECT source
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 's2',
          type: 'url',
          url: 'https://example.com/broken',
          r2_key: null,
          summary: null,
        },
      ],
    });

    // UPDATE status to fetching
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to failed (after content extraction fails)
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await processSourceIngest({ sourceId: 's2', userId: 'u1' });

    // Should have tried to set status to 'failed'
    const failedCall = mocks.query.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes("status = 'failed'"),
    );
    expect(failedCall).toBeTruthy();
  });

  it('sets status to failed when embedding generation fails', async () => {
    // SELECT source
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 's3',
          type: 'note',
          url: null,
          r2_key: null,
          summary: 'Test note',
        },
      ],
    });

    // UPDATE status to fetching
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to chunking
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Metadata extraction
    mocks.messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '{"title": null, "author": null, "publishedDate": null, "summary": "Test"}',
        },
      ],
    });

    // UPDATE metadata
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to embedding
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Embedding fails
    mocks.voyageEmbed.mockRejectedValueOnce(new Error('Voyage API error'));

    // UPDATE status to failed
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await processSourceIngest({ sourceId: 's3', userId: 'u1' });

    const failedCall = mocks.query.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes("status = 'failed'"),
    );
    expect(failedCall).toBeTruthy();
  });

  it('continues processing when metadata extraction fails', async () => {
    // SELECT source
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 's4',
          type: 'note',
          url: null,
          r2_key: null,
          summary: 'Note content',
        },
      ],
    });

    // UPDATE status to fetching
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to chunking
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Metadata extraction fails
    mocks.messagesCreate.mockRejectedValueOnce(new Error('API error'));

    // UPDATE status to embedding
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // Generate embeddings
    mocks.voyageEmbed.mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2] }],
    });

    // DELETE old chunks
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // INSERT chunk
    mocks.query.mockResolvedValueOnce({ rows: [] });

    // UPDATE status to ready
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await processSourceIngest({ sourceId: 's4', userId: 'u1' });

    // Should still complete successfully (metadata failure is non-fatal)
    const readyCall = mocks.query.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes("status = 'ready'"),
    );
    expect(readyCall).toBeTruthy();
  });
});
