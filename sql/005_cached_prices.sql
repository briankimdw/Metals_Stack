-- Cached metal prices — one row per day, avoids repeated external API calls
CREATE TABLE IF NOT EXISTS cached_prices (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fetched_at DATE        NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  gold       NUMERIC,
  silver     NUMERIC,
  platinum   NUMERIC,
  palladium  NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow anyone to read cached prices (public data)
ALTER TABLE cached_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cached prices"
  ON cached_prices FOR SELECT
  USING (true);

-- Allow inserts from service role (serverless function)
-- The anon key can also insert since we use service role server-side
CREATE POLICY "Service can insert cached prices"
  ON cached_prices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update cached prices"
  ON cached_prices FOR UPDATE
  USING (true);
