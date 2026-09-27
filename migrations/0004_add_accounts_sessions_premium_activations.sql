UPDATE access_state SET mode = 'free';
--> statement-breakpoint
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
--> statement-breakpoint
CREATE TABLE premium_activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mvp_demo')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX premium_activations_user_id_idx ON premium_activations(user_id);
