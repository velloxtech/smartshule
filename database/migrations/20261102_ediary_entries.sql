-- =========================================================================
-- SmartShule Database Migration: Digital E-Diary Persistence & Schema
-- Creates ediary_entries table with JSONB tasks, tomorrow requirements,
-- parent acknowledgements, status transitions, and duplicate prevention.
-- =========================================================================

CREATE TABLE IF NOT EXISTS ediary_entries (
  id VARCHAR(100) PRIMARY KEY,
  school_id VARCHAR(100) NOT NULL,
  classroom_id VARCHAR(100),
  stream_id VARCHAR(100) NOT NULL,
  student_id VARCHAR(100),
  teacher_id VARCHAR(100) NOT NULL,
  teacher_name VARCHAR(255),
  academic_year_id VARCHAR(100),
  term_id VARCHAR(100),
  date VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  homework TEXT,
  homework_tasks JSONB DEFAULT '[]'::jsonb,
  teacher_remarks TEXT,
  requirements_tomorrow TEXT,
  tomorrow_requirements JSONB DEFAULT '[]'::jsonb,
  acknowledgements JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'PUBLISHED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_ediary_school ON ediary_entries(school_id);
CREATE INDEX IF NOT EXISTS idx_ediary_stream_date ON ediary_entries(stream_id, date);
CREATE INDEX IF NOT EXISTS idx_ediary_student ON ediary_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_ediary_teacher ON ediary_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ediary_date ON ediary_entries(date);
CREATE INDEX IF NOT EXISTS idx_ediary_status ON ediary_entries(status);

-- Duplicate prevention and idempotency:
-- Ensures at most one stream-level diary entry per school, stream, and date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ediary_stream_unique_date
  ON ediary_entries(school_id, stream_id, date)
  WHERE student_id IS NULL;

-- Ensures at most one student-specific diary entry per student and date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ediary_student_unique_date
  ON ediary_entries(school_id, stream_id, student_id, date)
  WHERE student_id IS NOT NULL;
