DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE access_state (
  id INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL CHECK (mode IN ('free', 'premium_demo')),
  updated_at INTEGER NOT NULL
);
