/*
  # Complete Database Backup
  
  This file contains the complete database schema including:
  1. All Tables
  2. Security Policies
  3. Initial Data
  4. Functions
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS mlbb_products CASCADE;
DROP TABLE IF EXISTS freefire_products CASCADE;
DROP TABLE IF EXISTS resellers CASCADE;
DROP TABLE IF EXISTS reseller_prices CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;

-- Create admin_settings table
CREATE TABLE admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create mlbb_products table
CREATE TABLE mlbb_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  diamonds INTEGER,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL CHECK (type IN ('diamonds', 'subscription', 'special')),
  image TEXT,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create freefire_products table
CREATE TABLE freefire_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  diamonds INTEGER,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL CHECK (type IN ('diamonds', 'subscription', 'special')),
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create resellers table
CREATE TABLE resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  devices TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create reseller_prices table
CREATE TABLE reseller_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  game TEXT NOT NULL CHECK (game IN ('mlbb', 'freefire')),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, game)
);

-- Create promo_codes table
CREATE TABLE promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlbb_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE freefire_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings
CREATE POLICY "Allow authenticated users to read admin settings"
  ON admin_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update admin settings"
  ON admin_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create policies for mlbb_products
CREATE POLICY "Allow public read access to mlbb_products"
  ON mlbb_products
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to modify mlbb_products"
  ON mlbb_products
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for freefire_products
CREATE POLICY "Allow public read access to freefire_products"
  ON freefire_products
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to modify freefire_products"
  ON freefire_products
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for resellers
CREATE POLICY "Allow public read access to resellers"
  ON resellers
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to modify resellers"
  ON resellers
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for reseller_prices
CREATE POLICY "Allow public read access to reseller_prices"
  ON reseller_prices
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to modify reseller_prices"
  ON reseller_prices
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for promo_codes
CREATE POLICY "Allow public read access to promo_codes"
  ON promo_codes
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to modify promo_codes"
  ON promo_codes
  FOR ALL
  TO authenticated
  USING (true);

-- Create function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_to_use TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  discount_percent INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if promo code exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM promo_codes 
    WHERE code = code_to_use 
    AND active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code', 0;
    RETURN;
  END IF;

  -- Check if maximum uses has been reached
  IF EXISTS (
    SELECT 1 FROM promo_codes 
    WHERE code = code_to_use 
    AND max_uses > 0 
    AND used_count >= max_uses
  ) THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum uses', 0;
    RETURN;
  END IF;

  -- Increment the used_count and return success
  UPDATE promo_codes 
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE code = code_to_use;

  RETURN QUERY 
    SELECT true, 'Promo code applied successfully', discount_percent 
    FROM promo_codes 
    WHERE code = code_to_use;
END;
$$;

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

-- Insert sample reseller
INSERT INTO resellers (username, password, active) VALUES
('demo_reseller', 'demo123', true)
ON CONFLICT DO NOTHING;

-- Insert sample promo code
INSERT INTO promo_codes (code, discount_percent, max_uses, active) VALUES
('WELCOME10', 10, 100, true)
ON CONFLICT DO NOTHING;