-- =========================================================================
-- SmartShule Database Migration: Teacher Diary Pipeline End-to-End
-- Enhances records_of_work to serve as the unified Teacher Diary & Record of Work
-- Connects Teacher Assignments -> Lesson Planning -> Diary Entry -> Review -> Curriculum Progression
-- =========================================================================

-- 1. Add comprehensive teaching record and workflow columns to records_of_work
ALTER TABLE records_of_work
  ADD COLUMN IF NOT EXISTS school_id VARCHAR(100) DEFAULT 'school-001',
  ADD COLUMN IF NOT EXISTS teacher_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term VARCHAR(50),
  ADD COLUMN IF NOT EXISTS classroom_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS class_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS stream_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stream_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS learning_area_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS strand_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS strand VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sub_strand_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_strand VARCHAR(255),
  ADD COLUMN IF NOT EXISTS week_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lesson_period VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lesson_date DATE,
  ADD COLUMN IF NOT EXISTS lesson_topic TEXT,
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
  ADD COLUMN IF NOT EXISTS learning_activities TEXT,
  ADD COLUMN IF NOT EXISTS resources TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS reflection_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_remarks TEXT,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS tracker_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_official_coverage BOOLEAN DEFAULT FALSE;

-- Sync week column with week_number if needed
UPDATE records_of_work SET week_number = week WHERE week_number IS NULL AND week IS NOT NULL;

-- 2. Indexes for efficient lookup & scoping
CREATE INDEX IF NOT EXISTS idx_records_of_work_school ON records_of_work(school_id);
CREATE INDEX IF NOT EXISTS idx_records_of_work_teacher ON records_of_work(teacher_id);
CREATE INDEX IF NOT EXISTS idx_records_of_work_class_subj ON records_of_work(classroom_id, learning_area_id);
CREATE INDEX IF NOT EXISTS idx_records_of_work_status ON records_of_work(status);
CREATE INDEX IF NOT EXISTS idx_records_of_work_date ON records_of_work(lesson_date);
CREATE INDEX IF NOT EXISTS idx_records_of_work_tracker ON records_of_work(tracker_id);

-- 3. Idempotency & duplicate protection:
-- Prevents duplicate submissions for the same class, subject, date, and period while allowing returned entries to be corrected
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_of_work_unique_session
  ON records_of_work(school_id, classroom_id, learning_area_id, lesson_date, lesson_period)
  WHERE classroom_id IS NOT NULL 
    AND learning_area_id IS NOT NULL 
    AND lesson_date IS NOT NULL 
    AND lesson_period IS NOT NULL 
    AND status != 'RETURNED';
