import type { ChunkWithSource } from '@research/common';
import { query } from 'app/db/pool/pool.js';

export async function vectorSearch(
  userId: string,
  embedding: number[],
  collectionId?: string,
  limit = 5,
): Promise<ChunkWithSource[]> {
  const embeddingStr = `[${embedding.join(',')}]`;
  let sql = `SELECT c.id, c.content, c.source_id, c.chunk_index, s.title, s.url
        FROM chunks c JOIN sources s ON c.source_id = s.id
        WHERE c.user_id = $1`;
  const params: unknown[] = [userId, embeddingStr];

  if (collectionId) {
    sql += ` AND c.source_id IN (SELECT source_id FROM collection_sources WHERE collection_id = $3)`;
    params.push(collectionId);
  }

  sql += ` ORDER BY c.embedding <=> $2::vector LIMIT ${limit}`;

  const result = await query<ChunkWithSource>(sql, params);
  return result.rows;
}
