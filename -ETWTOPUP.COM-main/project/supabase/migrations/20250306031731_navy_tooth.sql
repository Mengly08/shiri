/*
  # Add RLS policies for promo codes table

  1. Security Changes
    - Enable RLS on promo_codes table
    - Add policies for:
      - Selecting promo codes (all users)
      - Inserting promo codes (authenticated only)
      - Updating promo codes (authenticated only)
      - Deleting promo codes (authenticated only)
  
  2. Notes
    - Allows public read access for promo code validation
    - Restricts write operations to authenticated users only
*/

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