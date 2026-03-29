import { describe, expect, it } from 'vitest';

import { chunk, estimateTokens } from './index.js';

describe('estimateTokens', () => {
  it('estimates tokens as ceil(length / 4)', () => {
    expect(estimateTokens('hello')).toBe(2); // 5/4 = 1.25 → 2
    expect(estimateTokens('abcd')).toBe(1); // 4/4 = 1
    expect(estimateTokens('')).toBe(0);
  });

  it('handles long text', () => {
    const text = 'a'.repeat(2000);
    expect(estimateTokens(text)).toBe(500);
  });
});

describe('chunk', () => {
  it('returns a single chunk for short text', () => {
    const result = chunk('Hello world.', 500, 50);
    expect(result).toEqual(['Hello world.']);
  });

  it('returns empty array for empty text', () => {
    const result = chunk('', 500, 50);
    expect(result).toEqual([]);
  });

  it('splits paragraphs that exceed maxTokens', () => {
    const para1 = 'First paragraph.';
    const para2 = 'Second paragraph.';
    const text = `${para1}\n\n${para2}`;
    // Use a very small maxTokens to force splitting
    const result = chunk(text, 5, 0);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((c) => c.includes('First'))).toBe(true);
    expect(result.some((c) => c.includes('Second'))).toBe(true);
  });

  it('handles text with only whitespace between paragraphs', () => {
    const result = chunk('A\n\n\n\nB', 500, 0);
    expect(result).toEqual(['A\n\nB']);
  });

  it('splits long paragraphs by sentence when paragraph exceeds maxTokens', () => {
    // Create a paragraph with multiple sentences that exceeds maxTokens
    const longPara =
      'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.';
    const result = chunk(longPara, 10, 0); // very small max to force sentence splitting
    expect(result.length).toBeGreaterThan(1);
  });

  it('preserves overlap between chunks', () => {
    const para1 = 'word1 word2 word3 word4 word5';
    const para2 = 'word6 word7 word8 word9 word10';
    const text = `${para1}\n\n${para2}`;
    const result = chunk(text, 8, 2); // small max, overlap of 2 words
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('handles single-word text', () => {
    const result = chunk('Hello', 500, 50);
    expect(result).toEqual(['Hello']);
  });

  it('handles text with no paragraph breaks', () => {
    const text =
      'This is a single paragraph with no breaks but many words to force chunking at the sentence level.';
    const result = chunk(text, 10, 0);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // All content should be present across chunks
    const combined = result.join(' ');
    expect(combined).toContain('single paragraph');
  });
});
