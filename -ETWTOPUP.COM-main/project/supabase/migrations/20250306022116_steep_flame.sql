/*
  # Add Security Tables and Functions

  1. New Tables
    - `rate_limits` - Track API request limits
    - `promo_codes` - Store and manage promo codes
    - `order_hashes` - Prevent duplicate orders
  
  2. Functions
    - `check_rate_limit` - Enforce API rate limiting
    - `increment_promo_code_usage` - Safely handle promo codes
    - `validate_order_hash` - Prevent duplicate orders
*/

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  first_request timestamptz DEFAULT now(),
  last_request timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON rate_limits(ip_address, endpoint);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL,
  max_uses integer NOT NULL,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Order hashes table to prevent duplicates
CREATE TABLE IF NOT EXISTS order_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address text,
  p_endpoint text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
BEGIN
  -- Get or create rate limit record
  INSERT INTO rate_limits (ip_address, endpoint)
  VALUES (p_ip_address, p_endpoint)
  ON CONFLICT (ip_address, endpoint) DO UPDATE
  SET request_count = 
    CASE 
      WHEN rate_limits.first_request < now() - (p_window_seconds || ' seconds')::interval 
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    first_request = 
      CASE 
        WHEN rate_limits.first_request < now() - (p_window_seconds || ' seconds')::interval 
        THEN now()
        ELSE rate_limits.first_request
      END,
    last_request = now()
  RETURNING *
  INTO v_record;

  -- Check if limit exceeded
  RETURN v_record.request_count <= p_max_requests;
END;
$$;

-- Function to safely increment promo code usage
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
  v_promo promo_codes%ROWTYPE;
BEGIN
  -- Get promo code with row lock
  SELECT * FROM promo_codes 
  WHERE code = UPPER(code_to_use)
  FOR UPDATE
  INTO v_promo;

  -- Check if code exists
  IF v_promo.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid promo code', 0;
    RETURN;
  END IF;

  -- Check if code is active
  IF NOT v_promo.active THEN
    RETURN QUERY SELECT false, 'Promo code is inactive', 0;
    RETURN;
  END IF;

  -- Check expiration
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Promo code has expired', 0;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum uses', 0;
    RETURN;
  END IF;

  -- Increment usage
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  RETURN QUERY SELECT true, 'Promo code applied successfully', v_promo.discount_percent;
END;
$$;

-- Function to validate order hash
CREATE OR REPLACE FUNCTION validate_order_hash(p_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert hash, return false if it already exists
  BEGIN
    INSERT INTO order_hashes (hash) VALUES (p_hash);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END;
$$;

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_hashes ENABLE ROW LEVEL SECURITY;

-- Add some sample promo codes
INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at)
VALUES 
  ('WELCOME10', 10, 100, now() + interval '30 days'),
  ('SAVE20', 20, 50, now() + interval '15 days')
ON CONFLICT DO NOTHING;