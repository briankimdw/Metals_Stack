-- Migration: Transactions & Transaction Items
-- Run this in Supabase SQL Editor

-- 1. Transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('buy', 'sell', 'trade')),
  notes text DEFAULT '',
  cash_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- 2. Transaction items table
CREATE TABLE transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  holding_id uuid REFERENCES holdings(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out'))
);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own transaction items" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
  );
