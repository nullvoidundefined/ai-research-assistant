import {
  addSourceToCollection,
  createCollection,
  deleteCollection,
  getCollectionById,
  getCollectionByShareToken,
  getCollectionSources,
  getUserCollections,
  removeSourceFromCollection,
  setShareToken,
  updateCollection,
} from 'app/repositories/collections/collections.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';

const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export async function getCollectionsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  try {
    const collections = await getUserCollections(userId);
    res.json({ collections });
  } catch (err) {
    logger.error({ err }, 'Get collections failed');
    throw ApiError.internal('Failed to get collections');
  }
}

export async function createCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const parsed = createCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  try {
    const collection = await createCollection(
      userId,
      parsed.data.name,
      parsed.data.description,
    );
    res.status(201).json({ collection });
  } catch (err) {
    logger.error({ err }, 'Create collection failed');
    throw ApiError.internal('Failed to create collection');
  }
}

export async function getCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const collection = await getCollectionById(id, userId);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    const sources = await getCollectionSources(id);
    res.json({ collection, sources });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Get collection failed');
    throw ApiError.internal('Failed to get collection');
  }
}

export async function updateCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  const parsed = updateCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }
  try {
    const collection = await updateCollection(id, userId, parsed.data);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    res.json({ collection });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Update collection failed');
    throw ApiError.internal('Failed to update collection');
  }
}

export async function deleteCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const deleted = await deleteCollection(id, userId);
    if (!deleted) {
      throw ApiError.notFound('Collection not found');
    }
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Delete collection failed');
    throw ApiError.internal('Failed to delete collection');
  }
}

export async function addSourceToCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  const { sourceId } = req.body;
  if (!sourceId) {
    throw ApiError.badRequest('sourceId is required');
  }
  try {
    const collection = await getCollectionById(id, userId);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    await addSourceToCollection(id, sourceId);
    res.json({ message: 'Source added to collection' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Add source to collection failed');
    throw ApiError.internal('Failed to add source to collection');
  }
}

export async function removeSourceFromCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id, sourceId } = req.params;
  try {
    const collection = await getCollectionById(id, userId);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    await removeSourceFromCollection(id, sourceId);
    res.json({ message: 'Source removed from collection' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Remove source from collection failed');
    throw ApiError.internal('Failed to remove source from collection');
  }
}

export async function shareCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  try {
    const collection = await getCollectionById(id, userId);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    const token = randomBytes(32).toString('hex');
    const updated = await setShareToken(id, userId, token);
    res.json({ collection: updated, shareUrl: `/share/${token}` });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Share collection failed');
    throw ApiError.internal('Failed to share collection');
  }
}

export async function getPublicCollection(
  req: Request,
  res: Response,
): Promise<void> {
  const { token } = req.params;
  try {
    const collection = await getCollectionByShareToken(token);
    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }
    const sources = await getCollectionSources(collection.id);
    res.json({ collection, sources });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Get public collection failed');
    throw ApiError.internal('Failed to get collection');
  }
}
