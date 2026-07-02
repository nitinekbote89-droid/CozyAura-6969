-- Patch 9: Add email column back to messages table
-- Run this once in your Supabase SQL Editor

ALTER TABLE messages ADD COLUMN email TEXT;
