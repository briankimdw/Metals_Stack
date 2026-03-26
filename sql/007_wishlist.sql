-- Migration: Wishlist items table
-- Run this in your Supabase SQL Editor to enable the wishlist feature.

CREATE TABLE IF NOT EXISTS wishlist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url        TEXT NOT NULL,
  name       TEXT NOT NULL,
  metal      TEXT,
  price      NUMERIC,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own wishlist_items" ON wishlist_items
  FOR ALL USING (auth.uid() = user_id);
