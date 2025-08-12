/*
  # Complete Database Setup for JACKSTORE
  
  This script creates all necessary tables and initial data for the JACKSTORE application.
  Run this script to set up a fresh database or restore from backup.
  
  Tables created:
  - mlbb_products: Mobile Legends products
  - freefire_products: Free Fire products
  - admin_settings: Admin authentication settings
  - resellers: Reseller accounts
  - reseller_prices: Special pricing for resellers
  
  All tables have Row Level Security (RLS) enabled with appropriate policies.
*/

-- Create MLBB Products table
CREATE TABLE IF NOT EXISTS mlbb_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  diamonds INTEGER,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  image TEXT,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create Free Fire Products table (without code field)
CREATE TABLE IF NOT EXISTS freefire_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  diamonds INTEGER,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
ALTER TABLE mlbb_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE freefire_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to MLBB products"
  ON mlbb_products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to Free Fire products"
  ON freefire_products
  FOR SELECT
  TO public
  USING (true);

-- Allow public access to admin_settings for login purposes
CREATE POLICY "Allow public to read admin settings"
  ON admin_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public to update admin settings"
  ON admin_settings
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public to insert admin settings"
  ON admin_settings
  FOR INSERT
  WITH CHECK (true);

-- Allow public access to resellers table for login purposes
CREATE POLICY "Allow public access to resellers"
  ON resellers
  USING (true);

-- Allow public access to reseller_prices
CREATE POLICY "Allow public to manage reseller prices"
  ON reseller_prices
  USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS mlbb_products_type_idx ON mlbb_products(type);
CREATE INDEX IF NOT EXISTS freefire_products_type_idx ON freefire_products(type);
CREATE INDEX IF NOT EXISTS reseller_prices_product_game_idx ON reseller_prices(product_id, game);

-- Insert default admin password
INSERT INTO admin_settings (password)
VALUES ('superpassword123')
ON CONFLICT DO NOTHING;

-- Insert MLBB products with sequential IDs
INSERT INTO mlbb_products (name, diamonds, price, currency, type, image, code)
VALUES
  ('11 Diamonds', 11, 0.25, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('22 Diamonds', 22, 0.50, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('56 Diamonds', 56, 0.90, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('86 Diamonds', 86, 1.15, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('172 Diamonds', 172, 2.30, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('257 Diamonds', 257, 3.30, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('343 Diamonds', 343, 4.40, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('429 Diamonds', 429, 5.60, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('514 Diamonds', 514, 6.70, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('600 Diamonds', 600, 7.85, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('706 Diamonds', 706, 9.00, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('792 Diamonds', 792, 9.90, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('878 Diamonds', 878, 11.40, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('963 Diamonds', 963, 12.90, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG', NULL),
  ('1049 Diamonds', 1049, 13.50, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('1135 Diamonds', 1135, 14.65, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('1220 Diamonds', 1220, 16.50, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('1412 Diamonds', 1412, 18.20, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('1755 Diamonds', 1755, 23.50, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('2195 Diamonds', 2195, 27.60, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('2901 Diamonds', 2901, 36.70, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('3688 Diamonds', 3688, 44.99, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('4390 Diamonds', 4390, 52.99, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('5532 Diamonds', 5532, 69.99, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('9288 Diamonds', 9288, 115.00, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ld.jpg', NULL),
  ('Weekly', NULL, 1.30, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp'),
  ('2Weekly', NULL, 2.60, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp2'),
  ('3Weekly', NULL, 3.90, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp3'),
  ('4Weekly', NULL, 5.20, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp4'),
  ('5Weekly', NULL, 6.50, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp5'),
  ('10Weekly', NULL, 13.00, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20240826_132258.png', 'wkp10'),
  ('Twilight Pass', NULL, 6.85, 'USD', 'special', 'https://i.postimg.cc/8CPzrFVZ/photo-6185826296332928051-x.jpg', 'Twilight'),
  ('Super Value Pass', NULL, 0.80, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Photoroom-20250303_211829.png', 'svp');

-- Insert Free Fire products with sequential IDs (without code field)
INSERT INTO freefire_products (name, diamonds, price, currency, type, image)
VALUES
  ('25 Diamonds', 25, 0.25, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('100 Diamonds', 100, 0.95, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('310 Diamonds', 310, 2.60, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('520 Diamonds', 520, 4.30, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('1060 Diamonds', 1060, 8.40, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('2180 Diamonds', 2180, 17.00, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('5600 Diamonds', 5600, 42.00, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('11500 Diamonds', 11500, 85.00, 'USD', 'diamonds', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp'),
  ('Evo3D', NULL, 0.60, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/FgIfEfLptWlIPu28cbcf2dJJuDbLo0GAvEJ5VnKR%20(2).png'),
  ('Evo7D', NULL, 0.80, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/a6Ep6vjATuFI3uWnlIZ2zhsG47dFIjniJD84WvWW%20(2).png'),
  ('Evo30D', NULL, 2.30, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/7MWaFgqN0f2vob12aRvD2mKYdfQ2da9j0wWLzbcJ%20(2).png'),
  ('Weekly', NULL, 1.45, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-removebg-preview.png'),
  ('Monthly', NULL, 6.85, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled__2_-removebg-preview.png'),
  ('WeeklyLite', NULL, 0.35, 'USD', 'subscription', 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/un.png');

-- Insert MLBB reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  -- Mobile Legends Diamonds
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
  
  -- Mobile Legends Subscriptions and Special Items
  (26, 'mlbb', 1.30), -- Weekly Pass (wkp)
  (27, 'mlbb', 2.60), -- 2Weekly Pass (wkp2)
  (28, 'mlbb', 3.90), -- 3Weekly Pass (wkp3)
  (29, 'mlbb', 5.20), -- 4Weekly Pass (wkp4)
  (30, 'mlbb', 6.50), -- 5Weekly Pass (wkp5)
  (31, 'mlbb', 13.00), -- 10Weekly Pass (wkp10)
  (32, 'mlbb', 6.85), -- Twilight Pass
  (33, 'mlbb', 0.69); -- Super Value Pass (svp)

-- Insert Free Fire reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  -- Free Fire Diamonds
  (1, 'freefire', 0.20), -- 25 Diamonds
  (2, 'freefire', 0.78), -- 100 Diamonds
  (3, 'freefire', 2.37), -- 310 Diamonds
  (4, 'freefire', 3.97), -- 520 Diamonds
  (5, 'freefire', 7.81), -- 1060 Diamonds
  (6, 'freefire', 15.78), -- 2180 Diamonds
  (7, 'freefire', 39.04), -- 5600 Diamonds
  (8, 'freefire', 80.42), -- 11500 Diamonds
  
  -- Free Fire Subscriptions
  (9, 'freefire', 0.47), -- Evo3D
  (10, 'freefire', 0.71), -- Evo7D
  (11, 'freefire', 2.12), -- Evo30D
  (12, 'freefire', 1.35), -- Weekly
  (13, 'freefire', 6.70), -- Monthly
  (14, 'freefire', 0.28); -- WeeklyLite






/*
  # Create promo codes table

  1. New Tables
    - `promo_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `discount_percent` (integer)
      - `max_uses` (integer)
      - `used_count` (integer)
      - `active` (boolean)
      - `expires_at` (timestamp with time zone)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on promo_codes table
    - Add policies for:
      - Selecting promo codes (all users)
      - Inserting promo codes (authenticated only)
      - Updating promo codes (authenticated only)
      - Deleting promo codes (authenticated only)

  3. Functions
    - Add function to increment promo code usage
*/

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses integer NOT NULL DEFAULT 0,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policy for reading promo codes (public access)
CREATE POLICY "Allow public to read promo codes"
  ON promo_codes
  FOR SELECT
  TO public
  USING (true);

-- Policy for inserting promo codes (authenticated only)
CREATE POLICY "Allow authenticated to insert promo codes"
  ON promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for updating promo codes (authenticated only)
CREATE POLICY "Allow authenticated to update promo codes"
  ON promo_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for deleting promo codes (authenticated only)
CREATE POLICY "Allow authenticated to delete promo codes"
  ON promo_codes
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to increment promo code usage and validate
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_to_use text)
RETURNS TABLE (
  success boolean,
  message text,
  discount_percent integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record promo_codes%ROWTYPE;
BEGIN
  -- Get the promo code record and lock it for update
  SELECT * INTO promo_record
  FROM promo_codes
  WHERE code = UPPER(code_to_use)
  FOR UPDATE;

  -- Check if promo code exists
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid promo code'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if promo code is active
  IF NOT promo_record.active THEN
    RETURN QUERY SELECT false, 'Promo code is inactive'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if promo code has expired
  IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Promo code has expired'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if promo code has reached max uses
  IF promo_record.max_uses > 0 AND promo_record.used_count >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum uses'::text, 0::integer;
    RETURN;
  END IF;

  -- Increment the used_count
  UPDATE promo_codes
  SET 
    used_count = used_count + 1,
    updated_at = NOW()
  WHERE id = promo_record.id;

  -- Return success with discount percentage
  RETURN QUERY SELECT 
    true,
    'Promo code applied successfully'::text,
    promo_record.discount_percent;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION increment_promo_code_usage IS 'Validates and increments usage count for promo codes';





