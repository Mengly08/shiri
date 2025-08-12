/*
  # Update admin settings permissions

  1. Security Changes
    - Allow public access to admin_settings table for login purposes
    - This fixes the "permission denied for table users" error
  
  2. Changes
    - Create a new policy that allows public access to admin_settings
    - This ensures the admin login can work without authentication
*/

-- Allow public access to admin_settings for login purposes
CREATE POLICY IF NOT EXISTS "Allow public to read admin settings"
  ON admin_settings
  FOR SELECT
  USING (true);