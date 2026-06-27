-- Patch 6: Performance Indexes for Orders Table
-- Run this once in your Supabase SQL Editor

-- Speeds up ORDER BY date DESC (used by admin and customer order fetch)
CREATE INDEX IF NOT EXISTS idx_orders_date_desc ON orders(date DESC);

-- Speeds up customer order lookup by email (used by track_order in store.js)
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(shipping_email);

-- Speeds up admin order_items join by order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
