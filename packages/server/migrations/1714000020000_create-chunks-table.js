export const shorthands = undefined;

export async function up(pgm) {
    pgm.sql(`
        CREATE TABLE chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            content TEXT NOT NULL,
            token_count INT NOT NULL DEFAULT 0,
            embedding vector(1024),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    pgm.sql("CREATE INDEX ON chunks(source_id)");
    pgm.sql("CREATE INDEX ON chunks(user_id)");
    pgm.sql("CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)");
}

export async function down(pgm) {
    pgm.sql("DROP TABLE IF EXISTS chunks CASCADE");
}
