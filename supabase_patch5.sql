-- https://supabase.com/dashboard/project/fxihqzepiayehvszyita/sql/new
-- SQL Patch to fix pickup address auto-saving

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
    p_discount NUMERIC(10, 2) DEFAULT 0,
    p_shipping NUMERIC(10, 2) DEFAULT 0,
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


    -- 5. Ensure address exists if not provided (except for pickup orders)
    IF v_addr_id IS NULL AND p_address_label != 'Pickup' THEN
        INSERT INTO user_addresses (user_email, label, fname, lname, address, city, state, pincode, phone, is_default)
        VALUES (p_email, p_address_label, split_part(p_name, ' ', 1), split_part(p_name, ' ', 2), p_shipping_address, p_city, p_state, p_pincode, COALESCE(p_phone, ''), true)
        RETURNING id INTO v_addr_id;
    END IF;

    -- 6. Insert order (includes denormalized shipping details)
    INSERT INTO orders (
        id, total, discount, shipping, shipping_address_id, items_summary, status,
        shipping_fname, shipping_lname, shipping_address, shipping_city,
        shipping_state, shipping_pincode, shipping_phone, shipping_email
    )
    VALUES (
        v_order_id, v_final_total, p_discount, p_shipping, v_addr_id, p_items_summary, 'Pending',
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
