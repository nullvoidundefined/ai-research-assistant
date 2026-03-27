import { query } from "app/db/pool/pool.js";
import type { MessageRole } from "@research/common";

export interface Message {
    id: string;
    conversation_id: string;
    role: MessageRole;
    content: string;
    cited_chunk_ids: string[];
    token_count: number;
    created_at: Date;
}

export async function saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    citedChunkIds: string[] = [],
    tokenCount = 0
): Promise<Message> {
    const result = await query<Message>(
        `INSERT INTO messages (conversation_id, role, content, cited_chunk_ids, token_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [conversationId, role, content, citedChunkIds, tokenCount]
    );
    // Update conversation updated_at
    await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
    return result.rows[0];
}

export async function getConversationMessages(
    conversationId: string,
    limit?: number
): Promise<Message[]> {
    const sql = limit
        ? `SELECT * FROM (SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2) sub ORDER BY created_at ASC`
        : "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC";
    const params = limit ? [conversationId, limit] : [conversationId];
    const result = await query<Message>(sql, params);
    return result.rows;
}
