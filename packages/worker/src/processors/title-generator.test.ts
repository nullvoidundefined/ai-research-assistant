import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  messagesCreate: vi.fn(),
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

vi.mock('app/utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { generateConversationTitle } from './title-generator.js';

describe('generateConversationTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates and saves a title', async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AI Research Discussion Overview' }],
    });
    mocks.query.mockResolvedValue({ rows: [] });

    await generateConversationTitle({
      conversationId: 'conv-1',
      firstMessage: 'What is AI?',
      firstResponse: 'AI stands for artificial intelligence.',
    });

    expect(mocks.messagesCreate).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledWith(
      'UPDATE conversations SET title = $1 WHERE id = $2',
      ['AI Research Discussion Overview', 'conv-1'],
    );
  });

  it('falls back to default title when response is not text', async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 't1' }],
    });
    mocks.query.mockResolvedValue({ rows: [] });

    await generateConversationTitle({
      conversationId: 'conv-1',
      firstMessage: 'Hello',
      firstResponse: 'Hi there',
    });

    expect(mocks.query).toHaveBeenCalledWith(
      'UPDATE conversations SET title = $1 WHERE id = $2',
      ['Research Conversation', 'conv-1'],
    );
  });

  it('handles API failure gracefully without throwing', async () => {
    mocks.messagesCreate.mockRejectedValue(new Error('API down'));

    await expect(
      generateConversationTitle({
        conversationId: 'conv-1',
        firstMessage: 'Hello',
        firstResponse: 'Hi',
      }),
    ).resolves.toBeUndefined();
  });
});
