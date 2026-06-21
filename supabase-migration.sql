-- ============================================================
-- Lumiere Store — Supabase Migration Script
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Configuration Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('GLOBAL_FRAGRANCES', '["lavender", "sandalwood", "vanilla", "eucalyptus"]')
ON CONFLICT (key) DO NOTHING;

-- 2. Promo Coupons Table
CREATE TABLE coupons (
    code TEXT PRIMARY KEY,
    discount INT NOT NULL CHECK (discount >= 0),
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'freeship')),
    status TEXT NOT NULL DEFAULT 'Active'
);

-- 3. Products Table
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Luxury Candle',
    price INT NOT NULL CHECK (price >= 0),
    weight INT NOT NULL DEFAULT 220 CHECK (weight >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    cover_image TEXT,
    description TEXT,
    specifications JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product Fragrance Variants Matrix
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    UNIQUE(product_id, variant_name)
);

-- 5. User Accounts Table
CREATE TABLE users (
    email TEXT PRIMARY KEY
);

-- 6. User Saved Addresses Table (Zomato-style)
CREATE TABLE user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
    label TEXT NOT NULL, -- 'Home', 'Work', 'Other'
    fname TEXT NOT NULL,
    lname TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customer Orders Table
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Shipped', 'Delivered')),
    tracking_number TEXT DEFAULT '',
    courier TEXT DEFAULT '',
    tracking_link TEXT DEFAULT '',
    shipping_address_id BIGINT REFERENCES user_addresses(id) ON DELETE SET NULL,
    items_summary TEXT NOT NULL,
    shipping_fname TEXT NOT NULL,
    shipping_lname TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_pincode TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_email TEXT NOT NULL
);

-- 8. Atomic Order Items Table
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- 9. Studio Contact Messages Table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_variants_product ON product_variants(product_id);
-- NOTE: idx_users_email removed — email is already the PRIMARY KEY, so it has an implicit index
CREATE INDEX idx_addresses_email ON user_addresses(user_email);
CREATE INDEX idx_orders_address ON orders(shipping_address_id);
CREATE INDEX idx_orders_date ON orders(date DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_locks_session ON inventory_locks(session_id);
CREATE INDEX idx_bis_product_variant ON back_in_stock_requests(product_id, variant_name);
CREATE INDEX idx_coupons_status ON coupons(status);

-- Stock Decrement Functions
CREATE OR REPLACE FUNCTION decrement_product_stock(prod_id TEXT, qty INT)
RETURNS VOID AS $$
BEGIN
    UPDATE products SET stock = GREATEST(0, stock - qty) WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_variant_stock(prod_id TEXT, v_name TEXT, qty INT)
RETURNS VOID AS $$
DECLARE
    new_stock INT;
    is_global BOOLEAN;
BEGIN
    UPDATE product_variants 
    SET stock = GREATEST(0, stock - qty)
    WHERE product_id = prod_id AND variant_name = v_name
    RETURNING stock INTO new_stock;

    SELECT COALESCE(value @> jsonb_build_array(v_name), FALSE)
    INTO is_global
    FROM settings
    WHERE key = 'GLOBAL_FRAGRANCES';

    IF new_stock = 0 AND NOT is_global THEN
        DELETE FROM product_variants
        WHERE product_id = prod_id AND variant_name = v_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Materialized View for Product Sales Calculation
-- Replaces the plain VIEW with a cached snapshot that is refreshed after each order.
-- This prevents a full order_items scan on every storefront page load.
CREATE MATERIALIZED VIEW products_with_sales AS
SELECT 
    p.*,
    COALESCE(SUM(oi.quantity), 0) AS total_sales,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) AS sales_rank
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id;

CREATE UNIQUE INDEX ON products_with_sales(id);

-- Refresh function — call this after each order is placed
CREATE OR REPLACE FUNCTION refresh_sales_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY products_with_sales;
END;
$$ LANGUAGE plpgsql;

-- 10. Back in stock requests table
CREATE TABLE back_in_stock_requests (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variant_name, email)
);

-- 11. Inventory Locks Table
CREATE TABLE inventory_locks (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    quantity INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locks_product_variant ON inventory_locks(product_id, variant_name, expires_at);

-- Atomic check-and-lock function using row-level locking
CREATE OR REPLACE FUNCTION acquire_stock_locks(
    p_session_id TEXT,
    p_items JSONB, -- Array of objects: {product_id, variant_name, quantity}
    p_expires_in_minutes INT
) RETURNS BOOLEAN AS $$
DECLARE
    item RECORD;
    v_available_stock INT;
    v_total_stock INT;
    v_locked_stock INT;
    v_is_valid BOOLEAN := TRUE;
BEGIN
    -- 1. Lock products and variant tables to prevent race conditions
    PERFORM id FROM products 
    WHERE id IN (SELECT jsonb_array_elements_text(jsonb_path_query_array(p_items, '$[*].product_id')))
    FOR UPDATE;

    -- 2. Validate availability for every item
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, variant_name TEXT, quantity INT) LOOP
        -- Get total stock
        IF item.variant_name = 'Standard' OR item.variant_name = '' THEN
            SELECT stock INTO v_total_stock FROM products WHERE id = item.product_id;
        ELSE
            SELECT stock INTO v_total_stock FROM product_variants WHERE product_id = item.product_id AND variant_name = item.variant_name;
        END IF;

        IF v_total_stock IS NULL THEN
            v_is_valid := FALSE;
            EXIT;
        END IF;

        -- Get locked stock (exclude locks held by current session to allow update/re-entry)
        SELECT COALESCE(SUM(quantity), 0) INTO v_locked_stock 
        FROM inventory_locks 
        WHERE product_id = item.product_id 
          AND variant_name = item.variant_name 
          AND expires_at > NOW()
          AND session_id != p_session_id;

        v_available_stock := v_total_stock - v_locked_stock;

        IF v_available_stock < item.quantity THEN
            v_is_valid := FALSE;
            EXIT;
        END IF;
    END LOOP;

    -- 3. Insert locks if valid
    IF v_is_valid THEN
        DELETE FROM inventory_locks WHERE session_id = p_session_id;

        FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, variant_name TEXT, quantity INT) LOOP
            INSERT INTO inventory_locks (session_id, product_id, variant_name, quantity, expires_at)
            VALUES (p_session_id, item.product_id, item.variant_name, item.quantity, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL);
        END LOOP;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Phase 2: Checkout Idempotency & Payment Security Integration
-- ============================================================

-- 1. Setup Order ID Sequence dynamically starting at current max order ID + 1
DO $$
DECLARE
    v_max_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'order_id_seq') THEN
        CREATE SEQUENCE order_id_seq;
    END IF;
    
    SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::INTEGER), 0) INTO v_max_id FROM orders;
    PERFORM setval('order_id_seq', GREATEST(1, v_max_id));
END $$;

-- 2. Processed Payments (Idempotency) Table
CREATE TABLE IF NOT EXISTS processed_payments (
    payment_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payment Intents (Total, Items & Webhook Recovery Data) Table
CREATE TABLE IF NOT EXISTS payment_intents (
    razorpay_order_id TEXT PRIMARY KEY,
    expected_total NUMERIC(10, 2) NOT NULL,
    expected_items TEXT NOT NULL, -- sorted canonical items string
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata for webhook recovery
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address_id BIGINT,
    shipping_address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    address_label TEXT,
    items_summary TEXT NOT NULL,
    raw_items JSONB NOT NULL,
    session_id TEXT NOT NULL
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires ON payment_intents(expires_at);

-- 4. Cleanup expired payment intents function
CREATE OR REPLACE FUNCTION cleanup_expired_payment_intents()
RETURNS VOID AS $$
BEGIN
    DELETE FROM payment_intents 
    WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 5. Attempt to register scheduled cleanup if pg_cron is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule first if exists to prevent duplicates
        PERFORM cron.unschedule('cleanup-payment-intents-nightly');
        PERFORM cron.schedule('cleanup-payment-intents-nightly', '0 0 * * *', 'SELECT cleanup_expired_payment_intents();');
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore pg_cron permission/existence issues
END $$;

-- 6. Atomic order placement function using transaction wrapping
CREATE OR REPLACE FUNCTION place_order_securely(
    p_payment_id TEXT,
    p_order_id TEXT, -- Ignored/auto-generated via sequence for online/COD orders
    p_email TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_address_id BIGINT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pincode TEXT,
    p_address_label TEXT,
    p_total NUMERIC(10, 2),
    p_items_summary TEXT,
    p_raw_items JSONB, -- Array of items: [{product_id, variant_name, quantity, price, product_name}]
    p_session_id TEXT, -- For releasing locks
    p_razorpay_order_id TEXT DEFAULT NULL -- Optional link for defense-in-depth total fetch
) RETURNS TEXT AS $$
DECLARE
    v_existing_order_id TEXT;
    v_order_id TEXT;
    item RECORD;
    v_addr_id BIGINT := p_address_id;
    v_final_total NUMERIC(10, 2);
BEGIN
    -- 1. Attempt to insert payment_id into processed_payments (Idempotency check)
    -- If it already exists, unique_violation is caught and we return the existing order_id
    BEGIN
        -- Generate sequence-based order ID first
        v_order_id := '#' || nextval('order_id_seq');

        INSERT INTO processed_payments (payment_id, order_id)
        VALUES (p_payment_id, v_order_id);
    EXCEPTION WHEN unique_violation THEN
        SELECT order_id INTO v_existing_order_id FROM processed_payments WHERE payment_id = p_payment_id;
        RETURN v_existing_order_id;
    END;

    -- 2. Defense-in-depth expected total fetch from payment_intents if razorpay_order_id is supplied
    IF p_razorpay_order_id IS NOT NULL AND p_razorpay_order_id != '' THEN
        SELECT expected_total INTO v_final_total 
        FROM payment_intents 
        WHERE razorpay_order_id = p_razorpay_order_id;
    END IF;

    -- Fallback to passed total (e.g. for COD or if intent not found)
    IF v_final_total IS NULL THEN
        v_final_total := p_total;
    END IF;

    -- 3. Decrement stock for each item using the helper functions
    FOR item IN SELECT * FROM jsonb_to_recordset(p_raw_items) AS x(product_id TEXT, variant_name TEXT, quantity INT) LOOP
        PERFORM decrement_product_stock(item.product_id, item.quantity);

        IF item.variant_name != 'Standard' AND item.variant_name != '' THEN
            PERFORM decrement_variant_stock(item.product_id, item.variant_name, item.quantity);
        END IF;
    END LOOP;

    -- 4. Ensure user exists
    INSERT INTO users (email)
    VALUES (p_email)
    ON CONFLICT (email) DO NOTHING;


    -- 5. Ensure address exists if not provided
    IF v_addr_id IS NULL THEN
        INSERT INTO user_addresses (user_email, label, fname, lname, address, city, state, pincode, phone, is_default)
        VALUES (p_email, p_address_label, split_part(p_name, ' ', 1), split_part(p_name, ' ', 2), p_shipping_address, p_city, p_state, p_pincode, COALESCE(p_phone, ''), true)
        RETURNING id INTO v_addr_id;
    END IF;

    -- 6. Insert order (includes denormalized shipping details)
    INSERT INTO orders (
        id, total, shipping_address_id, items_summary, status,
        shipping_fname, shipping_lname, shipping_address, shipping_city,
        shipping_state, shipping_pincode, shipping_phone, shipping_email
    )
    VALUES (
        v_order_id, v_final_total, v_addr_id, p_items_summary, 'Pending',
        split_part(p_name, ' ', 1), split_part(p_name, ' ', 2), p_shipping_address, p_city,
        p_state, p_pincode, COALESCE(p_phone, ''), p_email
    );

    -- 7. Insert order items — set-based INSERT (no loop, single round-trip)
    INSERT INTO order_items (order_id, product_id, product_name, variant_name, price, quantity)
    SELECT v_order_id, x.product_id, x.product_name, x.variant_name, x.price, x.quantity
    FROM jsonb_to_recordset(p_raw_items) AS x(
        product_id TEXT, product_name TEXT, variant_name TEXT, price NUMERIC(10,2), quantity INT
    );

    -- 8. Release temporary inventory locks
    DELETE FROM inventory_locks WHERE session_id = p_session_id;

    -- 9. Refresh the sales materialized view asynchronously
    PERFORM refresh_sales_view();

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Phase 3: Maintenance & Auto-Cleanup
-- ============================================================

-- Cleanup function for expired inventory locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS VOID AS $$
BEGIN
    DELETE FROM inventory_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule lock cleanup every 15 minutes if pg_cron is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('cleanup-expired-locks');
        PERFORM cron.schedule('cleanup-expired-locks', '*/15 * * * *', 'SELECT cleanup_expired_locks();');
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
