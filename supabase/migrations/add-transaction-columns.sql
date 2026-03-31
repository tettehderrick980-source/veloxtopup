-- Add missing columns to transactions table for guest checkout and order tracking

-- Add guest_email column for non-registered users
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Add cost_price column to track purchase cost
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);

-- Add selling_price column to track sale price
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Add profit column for profit tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2);

-- Add margin_percentage column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2);

-- Add capacity column for data bundle size
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS capacity TEXT;

-- Add payment_verified_at timestamp
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Add payment_failed_at timestamp
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE;

-- Add vendor_reference column for tracking provider order ID
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS vendor_reference TEXT;

-- Add fulfillment_status column for order tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending' 
CHECK (fulfillment_status IN ('pending', 'queued', 'processing', 'fulfilled', 'failed', 'expired'));

-- Add fulfillment_expires_at timestamp for queued orders
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS fulfillment_expires_at TIMESTAMP WITH TIME ZONE;

-- Add needs_refund flag for failed orders
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS needs_refund BOOLEAN DEFAULT FALSE;

-- Add refund_reason column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add user_report column for customer issue reports
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_report TEXT;

-- Add user_report_email column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_report_email TEXT;

-- Add user_report_phone column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_report_phone TEXT;

-- Add reported_at timestamp
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE;

-- Update the user_id column to allow NULL for guest transactions
ALTER TABLE transactions 
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the schema changes
COMMENT ON COLUMN transactions.guest_email IS 'Email for guest users who are not registered';
COMMENT ON COLUMN transactions.cost_price IS 'Cost price from vendor/provider';
COMMENT ON COLUMN transactions.selling_price IS 'Price sold to customer';
COMMENT ON COLUMN transactions.profit IS 'Profit margin for this transaction';
COMMENT ON COLUMN transactions.capacity IS 'Data bundle capacity (e.g., 1GB, 2GB)';
COMMENT ON COLUMN transactions.fulfillment_status IS 'Order fulfillment status: pending, queued, processing, fulfilled, failed, expired';
COMMENT ON COLUMN transactions.needs_refund IS 'Flag indicating if transaction needs refund due to failure';
