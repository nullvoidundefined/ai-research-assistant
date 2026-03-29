import { ApiError } from 'app/utils/ApiError.js';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { login, logout, me, register } from './auth.js';

const mockRegisterUser = vi.fn();
const mockLoginUser = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('app/services/auth.service.js', () => ({
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function createMockReqRes(body = {}, session: Record<string, unknown> = {}) {
  const req = {
    body,
    session: {
      ...session,
      destroy: vi.fn((cb: (err?: Error) => void) => cb()),
    },
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn(),
  } as unknown as Response;
  return { req, res };
}

describe('register handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid input', async () => {
    const { req, res } = createMockReqRes({ email: 'bad' });
    await expect(register(req, res)).rejects.toThrow(ApiError);
    await expect(register(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns 201 for valid registration', async () => {
    const user = { id: 'u1', email: 'test@example.com', name: 'Test' };
    mockRegisterUser.mockResolvedValue(user);

    const { req, res } = createMockReqRes({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    });
    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  });

  it('throws CONFLICT for duplicate email', async () => {
    mockRegisterUser.mockRejectedValue(new Error('Email already in use'));

    const { req, res } = createMockReqRes({
      email: 'dup@example.com',
      password: 'password123',
    });
    await expect(register(req, res)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });
});

describe('login handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR for invalid input', async () => {
    const { req, res } = createMockReqRes({ email: 'bad' });
    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns user data for valid login', async () => {
    const user = { id: 'u1', email: 'test@example.com', name: 'Test' };
    mockLoginUser.mockResolvedValue(user);

    const { req, res } = createMockReqRes({
      email: 'test@example.com',
      password: 'password123',
    });
    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  });

  it('throws UNAUTHORIZED for invalid credentials', async () => {
    mockLoginUser.mockRejectedValue(new Error('Invalid email or password'));

    const { req, res } = createMockReqRes({
      email: 'test@example.com',
      password: 'wrong',
    });
    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

describe('logout handler', () => {
  it('clears cookie and returns success', async () => {
    const { req, res } = createMockReqRes();
    await logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('sid');
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
  });
});

describe('me handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHORIZED when no userId in session', async () => {
    const { req, res } = createMockReqRes();
    await expect(me(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('returns user data when authenticated', async () => {
    const user = { id: 'u1', email: 'test@example.com', name: 'Test' };
    mockGetUserById.mockResolvedValue(user);

    const { req, res } = createMockReqRes({}, { userId: 'u1' });
    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  });

  it('throws NOT_FOUND when user not found', async () => {
    mockGetUserById.mockResolvedValue(null);

    const { req, res } = createMockReqRes({}, { userId: 'nonexistent' });
    await expect(me(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
