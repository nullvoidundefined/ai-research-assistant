import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('app/db/pool/pool.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { vectorSearch } from './chunks.js';

describe('vectorSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns matching chunks for a user', async () => {
    const chunks = [
      {
        id: 'c1',
        content: 'AI content',
        source_id: 's1',
        chunk_index: 0,
        title: 'Article',
        url: 'https://example.com',
      },
    ];
    mockQuery.mockResolvedValue({ rows: chunks });

    const embedding = [0.1, 0.2, 0.3];
    const result = await vectorSearch('user-1', embedding);

    expect(result).toEqual(chunks);
    expect(mockQuery).toHaveBeenCalledOnce();
    // Verify userId is the first param
    expect(mockQuery.mock.calls[0][1][0]).toBe('user-1');
  });

  it('includes collectionId filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await vectorSearch('user-1', [0.1, 0.2], 'col-1');

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('collection_id');
    expect(mockQuery.mock.calls[0][1]).toContain('col-1');
  });

  it('does not include collection filter when collectionId is undefined', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await vectorSearch('user-1', [0.1, 0.2]);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('collection_id');
  });

  it('respects custom limit parameter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await vectorSearch('user-1', [0.1], undefined, 10);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('LIMIT 10');
  });
});
