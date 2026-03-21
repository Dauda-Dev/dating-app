-- Migration: Add password reset fields to users table
-- Date: 2026-02-04
-- Description: Add support for password reset functionality

BEGIN;

-- Add password reset token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

-- Add password reset expiry column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create indexes for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(password_reset_expires);

-- Add constraint to ensure token and expiry are paired
-- (if one is set, both should be set, handled in application logic)

COMMIT;

-- Verify migration
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('password_reset_token', 'password_reset_expires');
