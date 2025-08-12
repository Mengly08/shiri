/*
  # Add reseller system

  1. New Tables
    - `resellers`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password` (text)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_login` (timestamp)
      - `login_count` (integer)
      - `devices` (text array)
    - `reseller_prices`
      - `id` (serial, primary key)
      - `product_id` (integer)
      - `game` (text)
      - `price` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on both tables
    - Add policies for public access to reseller_prices
    - Add policies for admin access to manage resellers
*/

-- Create resellers table
CREATE TABLE IF NOT EXISTS resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  devices TEXT[] DEFAULT '{}'
);

-- Create reseller_prices table
CREATE TABLE IF NOT EXISTS reseller_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to reseller_prices
CREATE POLICY "Allow public read access to reseller prices"
  ON reseller_prices
  FOR SELECT
  TO public
  USING (true);

-- Create policies for admin users to manage resellers
CREATE POLICY "Allow admin users to manage resellers"
  ON resellers
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@jackstore.com'
  ));

-- Create policies for admin users to manage reseller prices
CREATE POLICY "Allow admin users to manage reseller prices"
  ON reseller_prices
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@jackstore.com'
  ));

-- Insert MLBB reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  (1, 'mlbb', 0.18),  -- 11 Diamonds
  (2, 'mlbb', 0.34),  -- 22 Diamonds
  (3, 'mlbb', 0.83),  -- 56 Diamonds
  (4, 'mlbb', 1.05),  -- 86 Diamonds
  (5, 'mlbb', 2.09),  -- 172 Diamonds
  (6, 'mlbb', 3.04),  -- 257 Diamonds
  (7, 'mlbb', 4.09),  -- 343 Diamonds
  (8, 'mlbb', 5.12),  -- 429 Diamonds
  (9, 'mlbb', 6.07),  -- 514 Diamonds
  (10, 'mlbb', 7.12), -- 600 Diamonds
  (11, 'mlbb', 8.21), -- 706 Diamonds
  (12, 'mlbb', 9.26), -- 792 Diamonds
  (13, 'mlbb', 10.29), -- 878 Diamonds
  (14, 'mlbb', 11.24), -- 963 Diamonds
  (15, 'mlbb', 12.30), -- 1049 Diamonds
  (16, 'mlbb', 13.33), -- 1135 Diamonds
  (17, 'mlbb', 14.28), -- 1220 Diamonds
  (18, 'mlbb', 16.42), -- 1412 Diamonds
  (19, 'mlbb', 20.50), -- 1755 Diamonds
  (20, 'mlbb', 24.85), -- 2195 Diamonds
  (21, 'mlbb', 33.17), -- 2901 Diamonds
  (22, 'mlbb', 41.45), -- 3688 Diamonds
  (23, 'mlbb', 49.70), -- 4390 Diamonds
  (24, 'mlbb', 62.59), -- 5532 Diamonds
  (25, 'mlbb', 103.95), -- 9288 Diamonds
  (26, 'mlbb', 1.30), -- Weekly
  (27, 'mlbb', 2.60), -- 2Weekly
  (28, 'mlbb', 3.90), -- 3Weekly
  (29, 'mlbb', 5.20), -- 4Weekly
  (30, 'mlbb', 6.50), -- 5Weekly
  (31, 'mlbb', 13.00), -- 10Weekly
  (32, 'mlbb', 6.85), -- Twilight Pass
  (33, 'mlbb', 0.69); -- Super Value Pass

-- Insert Free Fire reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  (1, 'freefire', 0.69), -- 55 Diamonds
  (2, 'freefire', 2.08), -- 165 Diamonds
  (3, 'freefire', 3.33), -- 275 Diamonds
  (4, 'freefire', 6.85); -- 565 Diamonds

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS reseller_prices_product_game_idx ON reseller_prices(product_id, game);