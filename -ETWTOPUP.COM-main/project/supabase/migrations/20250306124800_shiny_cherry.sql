/*
  # Create payment tokens table and functions

  1. New Tables
    - `payment_tokens`
      - `id` (uuid, primary key)
      - `token` (text, unique)
      - `order_data` (jsonb)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `used` (boolean)

  2. Security
    - Enable RLS on `payment_tokens` table
    - Add policies for token management
    
  3. Functions
    - create_payment_token: Creates a new token with 1 minute expiry
    - validate_payment_token: Validates and consumes a token
*/

-- Create payment tokens table
CREATE TABLE IF NOT EXISTS payment_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  order_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE payment_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserting new tokens
CREATE POLICY "Allow inserting new tokens" 
ON payment_tokens 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create policy to allow reading tokens
CREATE POLICY "Allow reading tokens" 
ON payment_tokens 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow updating tokens
CREATE POLICY "Allow updating tokens" 
ON payment_tokens 
FOR UPDATE 
TO authenticated 
USING (true);

-- Function to create a new payment token
CREATE OR REPLACE FUNCTION create_payment_token(order_info JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token TEXT;
BEGIN
  -- Generate a random token
  new_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert the new token with 1 minute expiry
  INSERT INTO payment_tokens (token, order_data, expires_at)
  VALUES (
    new_token,
    order_info,
    now() + interval '1 minute'
  );
  
  RETURN new_token;
END;
$$;

-- Function to validate and consume a token
CREATE OR REPLACE FUNCTION validate_payment_token(token_to_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_data payment_tokens%ROWTYPE;
BEGIN
  -- Get and lock the token row
  SELECT * INTO token_data
  FROM payment_tokens
  WHERE token = token_to_check
  AND used = false
  AND expires_at > now()
  FOR UPDATE;
  
  -- Check if token exists and is valid
  IF token_data.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired token');
  END IF;
  
  -- Mark token as used
  UPDATE payment_tokens
  SET used = true
  WHERE id = token_data.id;
  
  -- Return success with order data
  RETURN jsonb_build_object(
    'valid', true,
    'order_data', token_data.order_data
  );
END;
$$;