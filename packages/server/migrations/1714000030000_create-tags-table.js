export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
        CREATE TABLE tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, name)
        )
    `);

  pgm.sql(`
        CREATE TABLE source_tags (
            source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
            tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY(source_id, tag_id)
        )
    `);

  pgm.sql('CREATE INDEX ON tags(user_id)');
}

export async function down(pgm) {
  pgm.sql('DROP TABLE IF EXISTS source_tags CASCADE');
  pgm.sql('DROP TABLE IF EXISTS tags CASCADE');
}
