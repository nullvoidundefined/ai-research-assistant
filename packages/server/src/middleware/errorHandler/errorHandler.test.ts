import { ApiError } from 'app/utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from './errorHandler.js';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('errorHandler middleware', () => {
  it('returns 500 with INTERNAL_ERROR for generic errors', () => {
    const err = new Error('Something broke');
    const req = { path: '/test', method: 'GET' } as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('returns correct status and code for ApiError', () => {
    const err = ApiError.notFound('User not found');
    const req = { path: '/test', method: 'GET' } as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'User not found',
    });
  });

  it('includes details when present on ApiError', () => {
    const issues = [{ path: ['email'], message: 'Required' }];
    const err = ApiError.badRequest('Validation failed', issues);
    const req = { path: '/test', method: 'POST' } as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: issues,
    });
  });

  it('handles ApiError.unauthorized', () => {
    const err = ApiError.unauthorized();
    const req = { path: '/test', method: 'GET' } as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });

  it('handles ApiError.internal', () => {
    const err = ApiError.internal();
    const req = { path: '/test', method: 'GET' } as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
