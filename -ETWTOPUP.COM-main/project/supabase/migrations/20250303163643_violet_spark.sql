/*
  # Create separate tables for MLBB and Free Fire products

  1. New Tables
    - `mlbb_products` - For Mobile Legends products
      - `id` (integer, primary key)
      - `name` (text)
      - `diamonds` (integer, nullable)
      - `price` (numeric)
      - `currency` (text)
      - `type` (text)
      - `image` (text, nullable)
      - `code` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz, nullable)
    
    - `freefire_products` - For Free Fire products
      - `id` (integer, primary key)
      - `name` (text)
      - `diamonds` (integer, nullable)
      - `price` (numeric)
      - `currency` (text)
      - `type` (text)
      - `image` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz, nullable)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for admin management
  
  3. Data Migration
    - Move existing data to the new tables with sequential IDs
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

-- Enable Row Level Security
ALTER TABLE mlbb_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE freefire_products ENABLE ROW LEVEL SECURITY;

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

-- Create policies for admin users to manage products
CREATE POLICY "Allow admin users to manage MLBB products"
  ON mlbb_products
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@jackstore.com'
  ));

CREATE POLICY "Allow admin users to manage Free Fire products"
  ON freefire_products
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@jackstore.com'
  ));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS mlbb_products_type_idx ON mlbb_products(type);
CREATE INDEX IF NOT EXISTS freefire_products_type_idx ON freefire_products(type);

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