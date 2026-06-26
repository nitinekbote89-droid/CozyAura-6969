-- ============================================================
-- SQL Patch: Wishlist Table
-- Run this in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/fxihqzepiayehvszyita/sql/new
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlist (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, product_id, variant_name)
);

-- Add index for fast query performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_email);
