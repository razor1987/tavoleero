ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE users SET email_verified = 1;
--> statement-breakpoint
CREATE TABLE email_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX email_tokens_user_id_idx ON email_tokens(user_id);
--> statement-breakpoint
CREATE INDEX email_tokens_purpose_idx ON email_tokens(purpose);