import { query } from "app/db/pool/pool.js";

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: Date;
}

export async function createTag(userId: string, name: string, color?: string): Promise<Tag> {
    const result = await query<Tag>(
        "INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *",
        [userId, name, color ?? "#3b82f6"]
    );
    return result.rows[0];
}

export async function getUserTags(userId: string): Promise<Tag[]> {
    const result = await query<Tag>(
        "SELECT * FROM tags WHERE user_id = $1 ORDER BY name",
        [userId]
    );
    return result.rows;
}

export async function deleteTag(id: string, userId: string): Promise<boolean> {
    const result = await query(
        "DELETE FROM tags WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function addTagToSource(sourceId: string, tagId: string): Promise<void> {
    await query(
        "INSERT INTO source_tags (source_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [sourceId, tagId]
    );
}

export async function removeTagFromSource(sourceId: string, tagId: string): Promise<boolean> {
    const result = await query(
        "DELETE FROM source_tags WHERE source_id = $1 AND tag_id = $2",
        [sourceId, tagId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getSourceTags(sourceId: string): Promise<Tag[]> {
    const result = await query<Tag>(
        `SELECT t.* FROM tags t
         JOIN source_tags st ON t.id = st.tag_id
         WHERE st.source_id = $1
         ORDER BY t.name`,
        [sourceId]
    );
    return result.rows;
}
