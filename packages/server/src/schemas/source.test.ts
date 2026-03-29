import { describe, it, expect } from 'vitest';
import { createSourceSchema } from './source.js';

describe('createSourceSchema', () => {
  it('accepts url type with url', () => {
    const result = createSourceSchema.safeParse({
      type: 'url',
      url: 'https://example.com/article',
    });
    expect(result.success).toBe(true);
  });

  it('accepts note type with content', () => {
    const result = createSourceSchema.safeParse({
      type: 'note',
      content: 'Some note content',
    });
    expect(result.success).toBe(true);
  });

  it('accepts pdf type', () => {
    const result = createSourceSchema.safeParse({
      type: 'pdf',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = createSourceSchema.safeParse({
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid url format', () => {
    const result = createSourceSchema.safeParse({
      type: 'url',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = createSourceSchema.safeParse({
      url: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });
});
