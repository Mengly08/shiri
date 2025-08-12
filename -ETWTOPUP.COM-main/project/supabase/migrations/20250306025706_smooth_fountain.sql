/*
  # Create promo codes table and functions

  1. New Tables
    - `promo_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `discount_percent` (integer)
      - `max_uses` (integer)
      - `used_count` (integer)
      - `active` (boolean)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `promo_codes` table
    - Add policy for authenticated users to manage promo codes
    - Add policy for public to validate and use promo codes

  3. Functions
    - `increment_promo_code_usage` - Validates and increments usage count for a promo code
*/

-- Create promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin)
CREATE POLICY "Allow authenticated users to manage promo codes"
  ON promo_codes
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to validate and increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_to_use TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  discount_percent INTEGER
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
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid promo code', 0;
    RETURN;
  END IF;

  -- Check if promo code is active
  IF NOT promo_record.active THEN
    RETURN QUERY SELECT false, 'Promo code is inactive', 0;
    RETURN;
  END IF;

  -- Check if promo code has expired
  IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Promo code has expired', 0;
    RETURN;
  END IF;

  -- Check if promo code has reached max uses
  IF promo_record.max_uses > 0 AND promo_record.used_count >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum uses', 0;
    RETURN;
  END IF;

  -- Increment the used count
  UPDATE promo_codes
  SET 
    used_count = used_count + 1,
    updated_at = NOW()
  WHERE id = promo_record.id;

  -- Return success
  RETURN QUERY SELECT 
    true, 
    'Promo code applied successfully', 
    promo_record.discount_percent;
END;
$$;