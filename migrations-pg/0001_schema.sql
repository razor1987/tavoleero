-- Tavoleero Postgres schema (Supabase). Idempotent: safe to run at every boot.
-- Mirrors migrations/0001-0006 (SQLite) with Postgres types.
-- The prebuilt action bundle (vendor/actions.js) was compiled against the
-- drizzle sqlite-core schema, so driver values must look like SQLite's:
--   booleans  <-> INTEGER 0/1
--   timestamps <-> BIGINT milliseconds since epoch
--   ids        <-> BIGINT (node-postgres returns int8 as string by default;
--               db.ts overrides the type parser to return numbers)

CREATE TABLE IF NOT EXISTS access_state (
  id INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL CHECK (mode IN ('free', 'premium')),
  theme TEXT NOT NULL DEFAULT 'neon' CHECK (theme IN ('classic', 'neon', 'fresh', 'midnight')),
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS email_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS email_tokens_user_id_idx ON email_tokens(user_id);
CREATE INDEX IF NOT EXISTS email_tokens_purpose_idx ON email_tokens(purpose);

CREATE TABLE IF NOT EXISTS premium_activations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('mvp_demo')),
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS premium_activations_user_id_idx ON premium_activations(user_id);

-- Default singleton row for access_state on fresh databases.
INSERT INTO access_state (id, mode, theme, updated_at)
SELECT 1, 'free', 'neon', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE NOT EXISTS (SELECT 1 FROM access_state WHERE id = 1);
