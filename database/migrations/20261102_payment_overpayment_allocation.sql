-- Migration: 20261102_payment_overpayment_allocation.sql
-- Enforce strict overpayment eligibility and payment allocation breakdown

ALTER TABLE payments ADD COLUMN IF NOT EXISTS arrears_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS current_fees_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS overpayment_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS allocation_breakdown JSONB DEFAULT '[]'::jsonb;

-- Index for searching payments with overpayment credits
CREATE INDEX IF NOT EXISTS idx_payments_overpayment ON payments(overpayment_amount) WHERE overpayment_amount > 0;
