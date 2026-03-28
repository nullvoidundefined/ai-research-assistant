import { query } from 'app/db/pool/pool.js';

export interface Conversation {
  id: string;
  user_id: string;
  collection_id: string | null;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createConversation(
  userId: string,
  collectionId?: string,
): Promise<Conversation> {
  const result = await query<Conversation>(
    'INSERT INTO conversations (user_id, collection_id) VALUES ($1, $2) RETURNING *',
    [userId, collectionId ?? null],
  );
  return result.rows[0];
}

export async function getUserConversations(
  userId: string,
): Promise<Conversation[]> {
  const result = await query<Conversation>(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );
  return result.rows;
}

export async function getConversationById(
  id: string,
  userId: string,
): Promise<Conversation | null> {
  const result = await query<Conversation>(
    'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function deleteConversation(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await query(
    'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
