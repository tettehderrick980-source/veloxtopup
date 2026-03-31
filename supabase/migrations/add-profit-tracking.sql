-- Add profit tracking fields to transactions table
-- This migration adds cost_price, selling_price, and profit fields for proper profit tracking

-- Add profit tracking fields to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS capacity INTEGER, -- Data capacity in GB
ADD COLUMN IF NOT EXISTS vendor_reference TEXT;

-- Update existing transactions to set selling_price = amount (backward compatibility)
UPDATE transactions 
SET selling_price = amount, 
    cost_price = amount * 0.80, -- Assume 20% margin for existing transactions
    profit = amount * 0.20,
    margin_percentage = 20.00
WHERE selling_price IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_profit ON transactions(profit);
CREATE INDEX IF NOT EXISTS idx_transactions_cost_price ON transactions(cost_price);
CREATE INDEX IF NOT EXISTS idx_transactions_capacity ON transactions(capacity);

-- Add comment for documentation
COMMENT ON COLUMN transactions.cost_price IS 'Cost price from vendor API (GhDataConnect)';
COMMENT ON COLUMN transactions.selling_price IS 'Price charged to customer (includes margin)';
COMMENT ON COLUMN transactions.profit IS 'Profit amount (selling_price - cost_price)';
COMMENT ON COLUMN transactions.margin_percentage IS 'Percentage margin applied to cost price';
COMMENT ON COLUMN transactions.capacity IS 'Data bundle capacity in GB (from GhDataConnect API)';
COMMENT ON COLUMN transactions.vendor_reference IS 'Vendor transaction reference';
