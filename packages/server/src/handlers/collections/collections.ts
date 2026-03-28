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
    res.status(500).json({ error: 'Failed to get collections' });
  }
}

export async function createCollectionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const parsed = createCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
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
    res.status(500).json({ error: 'Failed to create collection' });
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
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    const sources = await getCollectionSources(id);
    res.json({ collection, sources });
  } catch (err) {
    logger.error({ err }, 'Get collection failed');
    res.status(500).json({ error: 'Failed to get collection' });
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
    res
      .status(400)
      .json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  try {
    const collection = await updateCollection(id, userId, parsed.data);
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    res.json({ collection });
  } catch (err) {
    logger.error({ err }, 'Update collection failed');
    res.status(500).json({ error: 'Failed to update collection' });
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
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete collection failed');
    res.status(500).json({ error: 'Failed to delete collection' });
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
    res.status(400).json({ error: 'sourceId is required' });
    return;
  }
  try {
    const collection = await getCollectionById(id, userId);
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    await addSourceToCollection(id, sourceId);
    res.json({ message: 'Source added to collection' });
  } catch (err) {
    logger.error({ err }, 'Add source to collection failed');
    res.status(500).json({ error: 'Failed to add source to collection' });
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
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    await removeSourceFromCollection(id, sourceId);
    res.json({ message: 'Source removed from collection' });
  } catch (err) {
    logger.error({ err }, 'Remove source from collection failed');
    res.status(500).json({ error: 'Failed to remove source from collection' });
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
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    const token = randomBytes(32).toString('hex');
    const updated = await setShareToken(id, userId, token);
    res.json({ collection: updated, shareUrl: `/share/${token}` });
  } catch (err) {
    logger.error({ err }, 'Share collection failed');
    res.status(500).json({ error: 'Failed to share collection' });
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
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    const sources = await getCollectionSources(collection.id);
    res.json({ collection, sources });
  } catch (err) {
    logger.error({ err }, 'Get public collection failed');
    res.status(500).json({ error: 'Failed to get collection' });
  }
}
