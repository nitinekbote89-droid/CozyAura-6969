-- Patch 13: Add missing columns to coupons table
-- Run this once in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/fxihqzepiayehvszyita/sql/new

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
