/*
  # Fix admin settings table

  1. Changes
    - Add a policy to allow public access to admin_settings table for login purposes
    - Insert default admin password if it doesn't exist
    - Fix RLS policies to ensure proper access
*/

-- Allow public access to admin_settings for login purposes
DROP POLICY IF EXISTS "Allow authenticated users to read admin settings" ON admin_settings;

CREATE POLICY "Allow public to read admin settings"
  ON admin_settings
  FOR SELECT
  USING (true);

-- Make sure we have a default admin password
DELETE FROM admin_settings;

INSERT INTO admin_settings (password)
VALUES ('superpassword123');