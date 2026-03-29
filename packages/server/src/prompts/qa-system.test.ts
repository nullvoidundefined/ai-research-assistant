import { describe, it, expect } from 'vitest';
import type { ChunkWithSource } from '@research/common';
import { buildContextBlock, buildQASystemPrompt } from './qa-system.js';

describe('buildQASystemPrompt', () => {
  it('returns a non-empty system prompt', () => {
    const prompt = buildQASystemPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
  });

  it('mentions citation notation', () => {
    const prompt = buildQASystemPrompt();
    expect(prompt).toContain('[1]');
  });
});

describe('buildContextBlock', () => {
  it('formats chunks with 1-indexed citation markers', () => {
    const chunks: ChunkWithSource[] = [
      {
        id: 'c1',
        content: 'First chunk content',
        source_id: 's1',
        chunk_index: 0,
        title: 'Source 1',
        url: 'https://example.com/1',
      },
      {
        id: 'c2',
        content: 'Second chunk content',
        source_id: 's2',
        chunk_index: 1,
        title: 'Source 2',
        url: 'https://example.com/2',
      },
    ];

    const result = buildContextBlock(chunks);
    expect(result).toContain('[1] First chunk content');
    expect(result).toContain('[2] Second chunk content');
  });

  it('returns empty string for empty chunks array', () => {
    const result = buildContextBlock([]);
    expect(result).toBe('');
  });

  it('handles single chunk', () => {
    const chunks: ChunkWithSource[] = [
      {
        id: 'c1',
        content: 'Only chunk',
        source_id: 's1',
        chunk_index: 0,
        title: null,
        url: null,
      },
    ];
    const result = buildContextBlock(chunks);
    expect(result).toBe('[1] Only chunk');
  });
});
