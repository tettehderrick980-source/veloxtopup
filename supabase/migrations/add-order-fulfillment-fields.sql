-- Add fields for order fulfillment tracking
-- This enables the new workflow: orders queue when wallet is low, auto-cancel after 1 hour

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'queued', 'processing', 'fulfilled', 'expired', 'cancelled', 'refunded')),
ADD COLUMN IF NOT EXISTS fulfillment_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fulfillment_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS refund_reference TEXT,
ADD COLUMN IF NOT EXISTS needs_refund BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_balance_alert_sent BOOLEAN DEFAULT false;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment_expires 
ON transactions(fulfillment_expires_at) 
WHERE fulfillment_status IN ('pending', 'queued', 'processing');

-- Create index for pending fulfillment orders
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment_pending 
ON transactions(fulfillment_status) 
WHERE fulfillment_status = 'queued';

-- Update comments for documentation
COMMENT ON COLUMN transactions.fulfillment_status IS 'Status of order fulfillment: pending (awaiting payment), queued (wallet low), processing (API call), fulfilled (success), expired (1hr timeout), cancelled, refunded';
COMMENT ON COLUMN transactions.fulfillment_expires_at IS 'When the queued order expires and should be auto-cancelled';
COMMENT ON COLUMN transactions.needs_refund IS 'True if payment was successful but order failed, indicating refund is needed';
