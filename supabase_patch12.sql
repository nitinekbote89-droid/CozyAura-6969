-- Patch 12: Backfill email addresses for existing test messages
-- Run this once in your Supabase SQL Editor

UPDATE messages SET user_email = 'ekbotenitin1@gmail.com' WHERE id = 1;
UPDATE messages SET user_email = 'vasantiekbote085@gmail.com' WHERE id IN (2, 3);
