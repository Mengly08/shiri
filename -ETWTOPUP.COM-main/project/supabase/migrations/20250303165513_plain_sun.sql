/*
  # Create admin settings table

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `password` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `admin_settings` table
    - Add policy for authenticated users to read/update admin settings
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read admin settings
CREATE POLICY "Allow authenticated users to read admin settings"
  ON admin_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update admin settings
CREATE POLICY "Allow authenticated users to update admin settings"
  ON admin_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Insert default admin password
INSERT INTO admin_settings (password)
VALUES ('superpassword123')
ON CONFLICT DO NOTHING;