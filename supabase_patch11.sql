-- Patch 11: Relate feedbacks to users table via foreign key
-- Run this once in your Supabase SQL Editor

ALTER TABLE feedbacks ADD CONSTRAINT feedbacks_user_email_fkey FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE SET NULL;
