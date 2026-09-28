CREATE TABLE access_state_next (
  id INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL CHECK (mode IN ('free', 'premium')),
  theme TEXT NOT NULL DEFAULT 'neon' CHECK (theme IN ('classic', 'neon', 'fresh', 'midnight')),
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
INSERT INTO access_state_next (id, mode, theme, updated_at)
SELECT id, mode, CASE WHEN theme = 'classic' THEN 'neon' ELSE theme END, updated_at
FROM access_state;
--> statement-breakpoint
DROP TABLE access_state;
--> statement-breakpoint
ALTER TABLE access_state_next RENAME TO access_state;
