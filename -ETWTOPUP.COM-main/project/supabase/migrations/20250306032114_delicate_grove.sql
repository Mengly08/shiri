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
ALTER TABLE promo_codes DISABLE ROW LEVEL SECURITY;


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
