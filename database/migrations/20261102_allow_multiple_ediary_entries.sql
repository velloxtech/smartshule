-- =========================================================================
-- SmartShule Database Migration: Allow Multiple E-Diary Entries
-- Drops restrictive unique indexes that prevented teachers from recording
-- distinct subject homework, tasks, or lessons for the same stream and date.
-- Preserves primary key identity and non-unique composite indexes for queries.
-- =========================================================================

DROP INDEX IF EXISTS idx_ediary_stream_unique_date;
DROP INDEX IF EXISTS idx_ediary_student_unique_date;

-- Composite performance indexes for multi-entry lookups
CREATE INDEX IF NOT EXISTS idx_ediary_school_stream_date ON ediary_entries(school_id, stream_id, date);
CREATE INDEX IF NOT EXISTS idx_ediary_school_classroom_date ON ediary_entries(school_id, classroom_id, date);
