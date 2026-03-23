-- Migration: Rename folders → tubes, add capacity column
-- If you already have a 'folders' table from a prior migration, run the ALTER lines.
-- If starting fresh, just run the CREATE TABLE.

-- Option A: Fresh install (no existing folders table)
CREATE TABLE IF NOT EXISTS tubes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#C4956A',
  capacity   INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tubes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tubes" ON tubes
  FOR ALL USING (auth.uid() = user_id);

-- Add tube_id column to holdings
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS tube_id UUID REFERENCES tubes(id) ON DELETE SET NULL;

-- Option B: If you already have a 'folders' table and want to migrate data,
-- run these instead of the CREATE TABLE above (uncomment):
-- ALTER TABLE folders RENAME TO tubes;
-- ALTER TABLE tubes ADD COLUMN capacity INTEGER DEFAULT 20;
-- ALTER TABLE holdings RENAME COLUMN folder_id TO tube_id;
