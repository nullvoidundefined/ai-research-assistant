import { sourceIngestQueue } from 'app/config/bullmq.js';
import {
  createSource,
  deleteSource,
  getSourceById,
  getUserSources,
  updateSourceStatus,
} from 'app/repositories/sources/sources.js';
import {
  addTagToSource,
  removeTagFromSource,
} from 'app/repositories/tags/tags.js';
import { createSourceSchema } from 'app/schemas/source.js';
import { deleteFile, uploadFile } from 'app/services/r2.service.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function createSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;

  const body = {
    type: req.body.type,
    url: req.body.url,
    content: req.body.content,
  };

  const parsed = createSourceSchema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }

  const { type, url, content } = parsed.data;

  try {
    let source;

    if (type === 'pdf') {
      const file = req.file;
      if (!file) {
        throw ApiError.badRequest('PDF file is required');
      }
      const sourceId = uuidv4();
      const r2Key = `sources/${userId}/${sourceId}/${file.originalname}`;
      await uploadFile(r2Key, file.buffer, file.mimetype);

      source = await createSource({
        userId,
        type: 'pdf',
        filename: file.originalname,
        r2Key,
        status: 'pending',
      });
    } else if (type === 'url') {
      if (!url) {
        throw ApiError.badRequest('URL is required for url type');
      }
      source = await createSource({
        userId,
        type: 'url',
        url,
        status: 'pending',
      });
    } else {
      if (!content) {
        throw ApiError.badRequest('Content is required for note type');
      }
      source = await createSource({
        userId,
        type: 'note',
        summary: content,
        status: 'pending',
      });
    }

    await sourceIngestQueue.add('ingest', { sourceId: source.id, userId });

    res.status(201).json({ source });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Create source failed');
    throw ApiError.internal('Failed to create source');
  }
}

export async function getSourcesHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { type, status, search, collection_id, tag_id } = req.query;

  try {
    const sources = await getUserSources(userId, {
      type: type as string | undefined as any,
      status: status as string | undefined as any,
      search: search as string | undefined,
      collectionId: collection_id as string | undefined,
      tagId: tag_id as string | undefined,
    });
    res.json({ sources });
  } catch (err) {
    logger.error({ err }, 'Get sources failed');
    throw ApiError.internal('Failed to get sources');
  }
}

export async function getSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;

  try {
    const source = await getSourceById(id, userId);
    if (!source) {
      throw ApiError.notFound('Source not found');
    }
    res.json({ source });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Get source failed');
    throw ApiError.internal('Failed to get source');
  }
}

export async function deleteSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;

  try {
    const source = await getSourceById(id, userId);
    if (!source) {
      throw ApiError.notFound('Source not found');
    }

    if (source.r2_key) {
      await deleteFile(source.r2_key).catch((err) =>
        logger.warn({ err }, 'Failed to delete R2 file'),
      );
    }

    const deleted = await deleteSource(id, userId);
    if (!deleted) {
      throw ApiError.notFound('Source not found');
    }
    res.json({ message: 'Source deleted' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Delete source failed');
    throw ApiError.internal('Failed to delete source');
  }
}

export async function reprocessSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;

  try {
    const source = await getSourceById(id, userId);
    if (!source) {
      throw ApiError.notFound('Source not found');
    }

    await updateSourceStatus(id, 'pending');
    await sourceIngestQueue.add('ingest', { sourceId: id, userId });
    res.json({ message: 'Source reprocessing started' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Reprocess source failed');
    throw ApiError.internal('Failed to reprocess source');
  }
}

export async function addTagToSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id } = req.params;
  const { tagId } = req.body;

  if (!tagId) {
    throw ApiError.badRequest('tagId is required');
  }

  try {
    const source = await getSourceById(id, userId);
    if (!source) {
      throw ApiError.notFound('Source not found');
    }
    await addTagToSource(id, tagId);
    res.json({ message: 'Tag added' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Add tag to source failed');
    throw ApiError.internal('Failed to add tag');
  }
}

export async function removeTagFromSourceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const { id, tagId } = req.params;

  try {
    const source = await getSourceById(id, userId);
    if (!source) {
      throw ApiError.notFound('Source not found');
    }
    await removeTagFromSource(id, tagId);
    res.json({ message: 'Tag removed' });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error({ err }, 'Remove tag from source failed');
    throw ApiError.internal('Failed to remove tag');
  }
}
