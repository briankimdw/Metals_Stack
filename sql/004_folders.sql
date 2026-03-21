-- Migration: Folders / Collections
-- Run this in Supabase SQL Editor

-- 1. Create folders table
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#C4956A',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own folders" ON folders FOR ALL USING (auth.uid() = user_id);

-- 2. Add folder_id column to holdings
ALTER TABLE holdings ADD COLUMN folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
