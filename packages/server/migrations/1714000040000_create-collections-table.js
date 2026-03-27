export const shorthands = undefined;

export async function up(pgm) {
    pgm.sql(`
        CREATE TABLE collections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            share_token VARCHAR(64) UNIQUE,
            is_public BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    pgm.sql(`
        CREATE TABLE collection_sources (
            collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
            added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY(collection_id, source_id)
        )
    `);

    pgm.sql(`
        CREATE TRIGGER set_collections_updated_at
        BEFORE UPDATE ON collections
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    pgm.sql("CREATE INDEX ON collections(user_id)");
    pgm.sql("CREATE INDEX ON collections(share_token) WHERE share_token IS NOT NULL");
}

export async function down(pgm) {
    pgm.sql("DROP TABLE IF EXISTS collection_sources CASCADE");
    pgm.sql("DROP TABLE IF EXISTS collections CASCADE");
}
