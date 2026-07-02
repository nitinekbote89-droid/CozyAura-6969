-- Patch 8: Rename messages.email to messages.phone
-- Run this once in your Supabase SQL Editor

ALTER TABLE messages RENAME COLUMN email TO phone;
