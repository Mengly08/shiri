/*
  # Create promo codes table and policies

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
    - Enable RLS on `promo_codes` table
    - Add policies for:
      - Select: Allow authenticated users to read all promo codes
      - Insert: Allow authenticated users to create promo codes
      - Update: Allow authenticated users to update promo codes
      - Delete: Allow authenticated users to delete promo codes

  3. Functions
    - Create function to validate and increment promo code usage
*/

-- Create promo codes table
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

-- Policies
CREATE POLICY "Allow authenticated users to read promo codes"
  ON promo_codes
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create promo codes"
  ON promo_codes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update promo codes"
  ON promo_codes
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete promo codes"
  ON promo_codes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Function to validate and increment promo code usage
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
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid promo code'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if promo code is active
  IF NOT promo_record.active THEN
    RETURN QUERY SELECT false, 'Promo code is inactive'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if promo code has expired
  IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Promo code has expired'::text, 0::integer;
    RETURN;
  END IF;

  -- Check if maximum uses reached (0 means unlimited)
  IF promo_record.max_uses > 0 AND promo_record.used_count >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum uses'::text, 0::integer;
    RETURN;
  END IF;

  -- Increment the used count
  UPDATE promo_codes
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = promo_record.id;

  -- Return success with discount percentage
  RETURN QUERY SELECT true, 'Promo code applied successfully'::text, promo_record.discount_percent::integer;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION increment_promo_code_usage TO authenticated;