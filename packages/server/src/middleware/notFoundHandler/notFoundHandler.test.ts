import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { notFoundHandler } from './notFoundHandler.js';

describe('notFoundHandler middleware', () => {
  it('returns 404 with route info', () => {
    const req = { method: 'GET', path: '/unknown' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'Route GET /unknown not found',
    });
  });

  it('includes POST method in error message', () => {
    const req = { method: 'POST', path: '/api/stuff' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'Route POST /api/stuff not found',
    });
  });
});
