-- Migration: 20261107_finance_parent_linking_and_bulk_billing.sql
-- Purpose:
-- 1. Create student_parent_links table for normalized parent-to-learner associations.
-- 2. Create bulk_billing_batches table for batch invoicing auditing and idempotency.
-- 3. Backfill student_parent_links from existing guardian records and student guardian_ids.
-- 4. Reconcile parent account for 0790760008 (Sophy Aluoch) so Parent Portal recognizes linked learners.

BEGIN;

-- 1. Create student_parent_links
CREATE TABLE IF NOT EXISTS student_parent_links (
    id VARCHAR(100) PRIMARY KEY,
    school_id VARCHAR(100) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_id VARCHAR(100) REFERENCES guardians(id) ON DELETE SET NULL,
    student_id VARCHAR(100) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'PARENT',
    is_primary BOOLEAN DEFAULT true,
    can_view_academics BOOLEAN DEFAULT true,
    can_view_finances BOOLEAN DEFAULT true,
    created_by_user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_parent_link UNIQUE (school_id, parent_user_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parent_links_parent ON student_parent_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_links_student ON student_parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_links_school ON student_parent_links(school_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_links_guardian ON student_parent_links(guardian_id);

-- 2. Create bulk_billing_batches
CREATE TABLE IF NOT EXISTS bulk_billing_batches (
    id VARCHAR(100) PRIMARY KEY,
    school_id VARCHAR(100) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id VARCHAR(100) NOT NULL,
    term_id VARCHAR(100) NOT NULL,
    scope VARCHAR(50) NOT NULL, -- 'ALL', 'ECDE', 'PRIMARY', 'JUNIOR_SECONDARY', 'GRADE'
    target_grade_level VARCHAR(50),
    total_eligible INT DEFAULT 0,
    total_generated INT DEFAULT 0,
    total_skipped INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    total_amount_billed NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'
    execution_summary JSONB DEFAULT '{}'::jsonb,
    created_by_user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_billing_batches_school ON bulk_billing_batches(school_id);
CREATE INDEX IF NOT EXISTS idx_bulk_billing_batches_period ON bulk_billing_batches(school_id, academic_year_id, term_id);

-- 3. Backfill student_parent_links from guardians and students
-- A. From guardians.student_ids
INSERT INTO student_parent_links (
    id, school_id, parent_user_id, guardian_id, student_id, relationship_type, is_primary, created_at, updated_at
)
SELECT 
    'link-' || md5(g.id || '-' || s.id),
    s.school_id,
    g.user_id,
    g.id,
    s.id,
    COALESCE(NULLIF(g.relationship, ''), 'PARENT'),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM guardians g
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(g.student_ids) = 'array' THEN g.student_ids ELSE '[]'::jsonb END) AS sid(elem)
JOIN students s ON s.id = sid.elem
JOIN users u ON u.id = g.user_id
ON CONFLICT (school_id, parent_user_id, student_id) DO UPDATE
SET guardian_id = EXCLUDED.guardian_id, updated_at = CURRENT_TIMESTAMP;

-- B. From students.guardian_ids
INSERT INTO student_parent_links (
    id, school_id, parent_user_id, guardian_id, student_id, relationship_type, is_primary, created_at, updated_at
)
SELECT 
    'link-' || md5(g.id || '-' || s.id),
    s.school_id,
    g.user_id,
    g.id,
    s.id,
    COALESCE(NULLIF(g.relationship, ''), 'PARENT'),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM students s
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(s.guardian_ids) = 'array' THEN s.guardian_ids ELSE '[]'::jsonb END) AS gid(elem)
JOIN guardians g ON g.id = gid.elem
JOIN users u ON u.id = g.user_id
ON CONFLICT (school_id, parent_user_id, student_id) DO UPDATE
SET guardian_id = EXCLUDED.guardian_id, updated_at = CURRENT_TIMESTAMP;

-- 4. Reconcile and link Sophy Aluoch accounts for phone 0790760008
-- Link Scarlet Achieng (student-g4-012) to both user-guardian-154 and user-guardian-g4-012
DO $$
BEGIN
    -- Ensure guardian-154 includes student-g4-012 in student_ids if not already
    UPDATE guardians
    SET student_ids = jsonb_build_array('student-g4-012'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'guardian-154' AND (student_ids IS NULL OR student_ids = '[]'::jsonb);

    -- Ensure student-g4-012 includes guardian-154 in guardian_ids
    UPDATE students
    SET guardian_ids = CASE 
        WHEN guardian_ids IS NULL OR guardian_ids = '[]'::jsonb THEN jsonb_build_array('guardian-g4-012', 'guardian-154')
        WHEN NOT guardian_ids ? 'guardian-154' THEN guardian_ids || jsonb_build_array('guardian-154')
        ELSE guardian_ids
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = 'student-g4-012';

    -- Add direct links in student_parent_links for both user-guardian accounts
    IF EXISTS (SELECT 1 FROM users WHERE id = 'user-guardian-154') AND EXISTS (SELECT 1 FROM students WHERE id = 'student-g4-012') THEN
        INSERT INTO student_parent_links (
            id, school_id, parent_user_id, guardian_id, student_id, relationship_type, is_primary
        ) VALUES (
            'link-sophy-154-g4-012',
            'school-001',
            'user-guardian-154',
            'guardian-154',
            'student-g4-012',
            'MOTHER',
            true
        ) ON CONFLICT (school_id, parent_user_id, student_id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE id = 'user-guardian-g4-012') AND EXISTS (SELECT 1 FROM students WHERE id = 'student-g4-012') THEN
        INSERT INTO student_parent_links (
            id, school_id, parent_user_id, guardian_id, student_id, relationship_type, is_primary
        ) VALUES (
            'link-sophy-g4-g4-012',
            'school-001',
            'user-guardian-g4-012',
            'guardian-g4-012',
            'student-g4-012',
            'MOTHER',
            true
        ) ON CONFLICT (school_id, parent_user_id, student_id) DO NOTHING;
    END IF;
END $$;

COMMIT;
