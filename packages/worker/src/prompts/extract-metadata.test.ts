import { describe, expect, it } from 'vitest';

import { buildExtractMetadataPrompt } from './extract-metadata.js';

describe('buildExtractMetadataPrompt', () => {
  it('includes content in the prompt', () => {
    const prompt = buildExtractMetadataPrompt('This is article text');
    expect(prompt).toContain('This is article text');
  });

  it('truncates content to 3000 characters', () => {
    const longContent = 'a'.repeat(5000);
    const prompt = buildExtractMetadataPrompt(longContent);
    // The prompt should not include all 5000 chars of content
    expect(prompt.length).toBeLessThan(5000);
  });

  it('requests JSON output with expected fields', () => {
    const prompt = buildExtractMetadataPrompt('test');
    expect(prompt).toContain('title');
    expect(prompt).toContain('author');
    expect(prompt).toContain('publishedDate');
    expect(prompt).toContain('summary');
    expect(prompt).toContain('JSON');
  });
});
