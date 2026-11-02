-- Migration: 20261102_enhancements_lunch_withdrawal_archive.sql
-- Description: Adds columns for lunch daily collections, reversals, idempotency, learner withdrawal, and retention policies.

-- 1. Lunch enrollments: payment frequency and daily rate
ALTER TABLE lunch_enrollments 
ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20) DEFAULT 'TERMLY',
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0;

-- 2. Lunch payments: reversal tracking, idempotency, and audit
ALTER TABLE lunch_payments 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS reversed_by_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS reversal_audit_metadata JSONB,
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lunch_payments_idempotency 
ON lunch_payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL AND is_reversed = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lunch_payments_reference 
ON lunch_payments(school_id, transaction_reference) 
WHERE transaction_reference IS NOT NULL AND transaction_reference != '' AND is_reversed = FALSE;

-- 3. Students: withdrawal and suspension metadata
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS withdrawal_date VARCHAR(30),
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
ADD COLUMN IF NOT EXISTS destination_school VARCHAR(255),
ADD COLUMN IF NOT EXISTS withdrawn_by_user_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS withdrawal_notes TEXT;

-- 4. Deleted / Archived students: retention policy and archive timestamps
ALTER TABLE deleted_students 
ADD COLUMN IF NOT EXISTS retention_policy_years INT DEFAULT 7,
ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
