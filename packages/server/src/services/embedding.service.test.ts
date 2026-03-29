import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use a holder object that vi.mock can reference via globalThis
const mocks = vi.hoisted(() => {
  return {
    embed: vi.fn(),
  };
});

vi.mock('voyageai', () => {
  class MockVoyageAIClient {
    embed(...args: unknown[]) {
      return mocks.embed(...args);
    }
  }
  return {
    default: { VoyageAIClient: MockVoyageAIClient },
  };
});

import { embed } from './embedding.service.js';

describe('embed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns embeddings for given texts', async () => {
    mocks.embed.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ],
    });

    const result = await embed(['hello', 'world']);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(mocks.embed).toHaveBeenCalledWith({
      input: ['hello', 'world'],
      model: 'voyage-3-lite',
      inputType: 'document',
    });
  });

  it('uses query inputType when specified', async () => {
    mocks.embed.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }],
    });

    await embed(['test query'], 'query');
    expect(mocks.embed).toHaveBeenCalledWith(
      expect.objectContaining({ inputType: 'query' }),
    );
  });

  it('returns empty array when data is null', async () => {
    mocks.embed.mockResolvedValue({ data: null });

    const result = await embed(['test']);
    expect(result).toEqual([]);
  });
});
