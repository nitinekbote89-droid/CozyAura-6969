-- Add delivery_method column to orders table with check constraint (defaults to 'Shipping')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'Shipping' CHECK (delivery_method IN ('Shipping', 'Pickup'));
