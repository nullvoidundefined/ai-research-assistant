import { loginSchema, registerSchema } from 'app/schemas/auth.js';
import {
  getUserById,
  loginUser,
  registerUser,
} from 'app/services/auth.service.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { Request, Response } from 'express';

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  const { email, password, name } = parsed.data;
  try {
    const user = await registerUser(email, password, name);
    req.session.userId = user.id;
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    logger.error({ err }, 'Register failed');
    if (err instanceof Error && err.message === 'Email already in use') {
      throw new ApiError(409, 'CONFLICT', err.message);
    }
    throw ApiError.internal('Registration failed');
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  const { email, password } = parsed.data;
  try {
    const user = await loginUser(email, password);
    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    throw ApiError.unauthorized('Invalid email or password');
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Session destroy failed');
      res
        .status(500)
        .json({ error: 'INTERNAL_ERROR', message: 'Logout failed' });
      return;
    }
    res.clearCookie('sid');
    res.json({ message: 'Logged out' });
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    throw ApiError.unauthorized();
  }
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Get me failed');
    throw ApiError.internal('Failed to get user');
  }
}
