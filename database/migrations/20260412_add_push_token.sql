-- Migration: Add push_token column to users table
-- Date: 2026-04-12
-- Adds device push token storage for Expo Push Notifications

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_token VARCHAR(255) DEFAULT NULL;

-- Index for fast lookup when sending batch pushes
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token)
  WHERE push_token IS NOT NULL;
