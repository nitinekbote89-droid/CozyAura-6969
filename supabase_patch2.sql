-- Fix refresh_sales_view: add SECURITY DEFINER so anon key can execute REFRESH MATERIALIZED VIEW
DROP FUNCTION IF EXISTS refresh_sales_view();
CREATE OR REPLACE FUNCTION refresh_sales_view()
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY products_with_sales;
END;
$$ LANGUAGE plpgsql;
