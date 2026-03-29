import {
  createTag,
  deleteTag,
  getUserTags,
} from 'app/repositories/tags/tags.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { Request, Response } from 'express';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});

export async function getTagsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  try {
    const tags = await getUserTags(userId);
    res.json({ tags });
  } catch (err) {
    logger.error({ err }, 'Get tags failed');
    throw ApiError.internal('Failed to get tags');
  }
}

export async function createTagHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  try {
    const tag = await createTag(userId, parsed.data.name, parsed.data.color);
    res.status(201).json({ tag });
  } catch (err) {
    logger.error({ err }, 'Create tag failed');
    throw ApiError.internal('Failed to create tag');
  }
}

export async function deleteTagHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const deleted = await deleteTag(id, userId);
    if (!deleted) {
      throw ApiError.notFound('Tag not found');
    }
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Delete tag failed');
    throw ApiError.internal('Failed to delete tag');
  }
}
