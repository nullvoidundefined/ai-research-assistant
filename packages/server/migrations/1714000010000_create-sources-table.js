export const shorthands = undefined;

export async function up(pgm) {
    pgm.sql(`
        CREATE TABLE sources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(10) NOT NULL CHECK (type IN ('url', 'pdf', 'note')),
            url TEXT,
            filename VARCHAR(255),
            r2_key TEXT,
            title TEXT,
            author TEXT,
            published_date DATE,
            summary TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fetching', 'chunking', 'embedding', 'ready', 'failed')),
            total_chunks INT NOT NULL DEFAULT 0,
            error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    pgm.sql(`
        CREATE TRIGGER set_sources_updated_at
        BEFORE UPDATE ON sources
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    pgm.sql("CREATE INDEX ON sources(user_id)");
    pgm.sql("CREATE INDEX ON sources(status)");
}

export async function down(pgm) {
    pgm.sql("DROP TABLE IF EXISTS sources CASCADE");
}
