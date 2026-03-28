export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
        CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
            title TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

  pgm.sql(`
        CREATE TABLE messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            cited_chunk_ids UUID[] NOT NULL DEFAULT '{}',
            token_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

  pgm.sql(`
        CREATE TRIGGER set_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

  pgm.sql('CREATE INDEX ON conversations(user_id)');
  pgm.sql('CREATE INDEX ON messages(conversation_id)');
}

export async function down(pgm) {
  pgm.sql('DROP TABLE IF EXISTS messages CASCADE');
  pgm.sql('DROP TABLE IF EXISTS conversations CASCADE');
}
