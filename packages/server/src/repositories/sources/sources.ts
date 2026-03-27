import { query } from "app/db/pool/pool.js";
import type { SourceType, SourceStatus } from "@research/common";

export interface Source {
    id: string;
    user_id: string;
    type: SourceType;
    url: string | null;
    filename: string | null;
    r2_key: string | null;
    title: string | null;
    author: string | null;
    published_date: string | null;
    summary: string | null;
    status: SourceStatus;
    total_chunks: number;
    error: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateSourceData {
    userId: string;
    type: SourceType;
    url?: string;
    filename?: string;
    r2Key?: string;
    title?: string;
    summary?: string;
    status?: SourceStatus;
}

export async function createSource(data: CreateSourceData): Promise<Source> {
    const result = await query<Source>(
        `INSERT INTO sources (user_id, type, url, filename, r2_key, title, summary, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            data.userId,
            data.type,
            data.url ?? null,
            data.filename ?? null,
            data.r2Key ?? null,
            data.title ?? null,
            data.summary ?? null,
            data.status ?? "pending",
        ]
    );
    return result.rows[0];
}

export async function getSourceById(id: string, userId: string): Promise<Source | null> {
    const result = await query<Source>(
        "SELECT * FROM sources WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return result.rows[0] ?? null;
}

export interface GetUserSourcesFilters {
    type?: SourceType;
    status?: SourceStatus;
    search?: string;
    collectionId?: string;
    tagId?: string;
}

export async function getUserSources(
    userId: string,
    filters: GetUserSourcesFilters = {}
): Promise<Source[]> {
    const params: unknown[] = [userId];
    let sql = "SELECT DISTINCT s.* FROM sources s";

    if (filters.tagId) {
        sql += " JOIN source_tags st ON s.id = st.source_id";
    }

    sql += " WHERE s.user_id = $1";

    if (filters.type) {
        params.push(filters.type);
        sql += ` AND s.type = $${params.length}`;
    }

    if (filters.status) {
        params.push(filters.status);
        sql += ` AND s.status = $${params.length}`;
    }

    if (filters.search) {
        params.push(`%${filters.search}%`);
        sql += ` AND (s.title ILIKE $${params.length} OR s.summary ILIKE $${params.length} OR s.url ILIKE $${params.length})`;
    }

    if (filters.collectionId) {
        params.push(filters.collectionId);
        sql += ` AND s.id IN (SELECT source_id FROM collection_sources WHERE collection_id = $${params.length})`;
    }

    if (filters.tagId) {
        params.push(filters.tagId);
        sql += ` AND st.tag_id = $${params.length}`;
    }

    sql += " ORDER BY s.created_at DESC";

    const result = await query<Source>(sql, params);
    return result.rows;
}

export async function updateSource(
    id: string,
    userId: string,
    data: Partial<{
        title: string | null;
        author: string | null;
        publishedDate: string | null;
        summary: string | null;
        status: SourceStatus;
        totalChunks: number;
        error: string | null;
    }>
): Promise<Source | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) { params.push(data.title); fields.push(`title = $${params.length}`); }
    if (data.author !== undefined) { params.push(data.author); fields.push(`author = $${params.length}`); }
    if (data.publishedDate !== undefined) { params.push(data.publishedDate); fields.push(`published_date = $${params.length}`); }
    if (data.summary !== undefined) { params.push(data.summary); fields.push(`summary = $${params.length}`); }
    if (data.status !== undefined) { params.push(data.status); fields.push(`status = $${params.length}`); }
    if (data.totalChunks !== undefined) { params.push(data.totalChunks); fields.push(`total_chunks = $${params.length}`); }
    if (data.error !== undefined) { params.push(data.error); fields.push(`error = $${params.length}`); }

    if (fields.length === 0) return null;

    params.push(id);
    params.push(userId);
    const result = await query<Source>(
        `UPDATE sources SET ${fields.join(", ")} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
        params
    );
    return result.rows[0] ?? null;
}

export async function updateSourceStatus(
    id: string,
    status: SourceStatus,
    error?: string
): Promise<void> {
    await query(
        "UPDATE sources SET status = $1, error = $2 WHERE id = $3",
        [status, error ?? null, id]
    );
}

export async function deleteSource(id: string, userId: string): Promise<boolean> {
    const result = await query(
        "DELETE FROM sources WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
}
