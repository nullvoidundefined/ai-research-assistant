import { query } from "app/db/pool/pool.js";

export interface Collection {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    share_token: string | null;
    is_public: boolean;
    created_at: Date;
    updated_at: Date;
}

export async function createCollection(
    userId: string,
    name: string,
    description?: string
): Promise<Collection> {
    const result = await query<Collection>(
        "INSERT INTO collections (user_id, name, description) VALUES ($1, $2, $3) RETURNING *",
        [userId, name, description ?? null]
    );
    return result.rows[0];
}

export async function getUserCollections(userId: string): Promise<Collection[]> {
    const result = await query<Collection>(
        "SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
    );
    return result.rows;
}

export async function getCollectionById(
    id: string,
    userId: string
): Promise<Collection | null> {
    const result = await query<Collection>(
        "SELECT * FROM collections WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return result.rows[0] ?? null;
}

export async function updateCollection(
    id: string,
    userId: string,
    data: Partial<{ name: string; description: string | null; isPublic: boolean }>
): Promise<Collection | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { params.push(data.name); fields.push(`name = $${params.length}`); }
    if (data.description !== undefined) { params.push(data.description); fields.push(`description = $${params.length}`); }
    if (data.isPublic !== undefined) { params.push(data.isPublic); fields.push(`is_public = $${params.length}`); }

    if (fields.length === 0) return null;

    params.push(id);
    params.push(userId);
    const result = await query<Collection>(
        `UPDATE collections SET ${fields.join(", ")} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
        params
    );
    return result.rows[0] ?? null;
}

export async function deleteCollection(id: string, userId: string): Promise<boolean> {
    const result = await query(
        "DELETE FROM collections WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function addSourceToCollection(
    collectionId: string,
    sourceId: string
): Promise<void> {
    await query(
        "INSERT INTO collection_sources (collection_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [collectionId, sourceId]
    );
}

export async function removeSourceFromCollection(
    collectionId: string,
    sourceId: string
): Promise<boolean> {
    const result = await query(
        "DELETE FROM collection_sources WHERE collection_id = $1 AND source_id = $2",
        [collectionId, sourceId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function setShareToken(
    id: string,
    userId: string,
    token: string
): Promise<Collection | null> {
    const result = await query<Collection>(
        "UPDATE collections SET share_token = $1, is_public = true WHERE id = $2 AND user_id = $3 RETURNING *",
        [token, id, userId]
    );
    return result.rows[0] ?? null;
}

export async function getCollectionByShareToken(
    token: string
): Promise<Collection | null> {
    const result = await query<Collection>(
        "SELECT * FROM collections WHERE share_token = $1 AND is_public = true",
        [token]
    );
    return result.rows[0] ?? null;
}

export async function getCollectionSources(collectionId: string) {
    const result = await query(
        `SELECT s.* FROM sources s
         JOIN collection_sources cs ON s.id = cs.source_id
         WHERE cs.collection_id = $1
         ORDER BY cs.added_at DESC`,
        [collectionId]
    );
    return result.rows;
}
