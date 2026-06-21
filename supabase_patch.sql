-- ============================================================
-- SQL Patch: Performance Indexes, Constraints, and RPCs
-- Run this in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/fxihqzepiayehvszyita/sql/new
-- ============================================================

-- 1. L5: Add indexes on orders(shipping_email) and orders(shipping_phone)
CREATE INDEX IF NOT EXISTS idx_orders_shipping_email ON orders(shipping_email);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_phone ON orders(shipping_phone);

-- 2. M12: Add UNIQUE constraint on inventory_locks(session_id, product_id, variant_name)
-- Delete duplicates first to prevent migration failure if table has data
DELETE FROM inventory_locks a
USING inventory_locks b
WHERE a.id < b.id 
  AND a.session_id = b.session_id 
  AND a.product_id = b.product_id 
  AND a.variant_name = b.variant_name;

ALTER TABLE inventory_locks ADD CONSTRAINT unique_session_product_variant UNIQUE (session_id, product_id, variant_name);

-- 3. L1: Add CHECK constraint on coupons.status
ALTER TABLE coupons ADD CONSTRAINT chk_coupons_status CHECK (status IN ('Active', 'Inactive'));

-- 4. M11: Add percent discount upper-bound CHECK (maximum 100%)
ALTER TABLE coupons ADD CONSTRAINT chk_coupons_percent_limit CHECK (type != 'percent' OR discount <= 100);

-- 5. L4: Add indexes on messages(date, email)
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);

-- 6. H9-SQL: Add save_product_variants RPC function for atomic variant deletion & insertion
CREATE OR REPLACE FUNCTION save_product_variants(
    p_product_id TEXT,
    p_variants JSONB
) RETURNS VOID AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Delete existing variants for this product
    DELETE FROM product_variants WHERE product_id = p_product_id;

    -- Insert new variants from JSON payload
    IF p_variants IS NOT NULL AND jsonb_array_length(p_variants) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_variants) AS x(variant_name TEXT, stock INT, image_url TEXT) LOOP
            INSERT INTO product_variants (product_id, variant_name, stock, image_url)
            VALUES (p_product_id, v_item.variant_name, v_item.stock, v_item.image_url);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Add tracking_link column to orders table for manual tracking links
ALTER TABLE orders ADD COLUMN tracking_link TEXT DEFAULT '';

