-- Patch 10: Relate messages to users table via foreign key
-- Run this once in your Supabase SQL Editor

ALTER TABLE messages DROP COLUMN IF EXISTS email;
ALTER TABLE messages ADD COLUMN user_email TEXT REFERENCES users(email) ON DELETE SET NULL;
