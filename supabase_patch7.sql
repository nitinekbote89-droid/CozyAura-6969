-- Patch 7: Order Feedbacks Table
-- Run this once in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedbacks (
    order_id TEXT PRIMARY KEY,
    user_email TEXT,
    customer_name TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
