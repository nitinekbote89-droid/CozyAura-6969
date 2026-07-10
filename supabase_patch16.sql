-- SQL Patch to update acquire_stock_locks to automatically prune expired locks
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

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
    -- 0. Prune expired locks first to ensure accurate calculations
    DELETE FROM inventory_locks WHERE expires_at < NOW();

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
