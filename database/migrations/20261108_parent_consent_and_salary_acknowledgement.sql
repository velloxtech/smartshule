-- Migration: 20261108_parent_consent_and_salary_acknowledgement.sql
-- Purpose:
-- 1. Create parent_consent_requests table for configurable school consent forms (trips, medical, media, sports, etc.).
-- 2. Create parent_consent_responses table for immutable audit trail of parent signatures, decisions, and versions.
-- 3. Add dispute columns to payroll_records for teacher discrepancy reporting.
-- 4. Seed default consent requests for Grace Seeds School demo environment.

BEGIN;

-- 1. Parent Consent Requests
CREATE TABLE IF NOT EXISTS parent_consent_requests (
    id VARCHAR(100) PRIMARY KEY,
    school_id VARCHAR(100) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'TRIP', 'MEDICAL', 'MEDIA', 'SPORTS', 'TRANSPORT', 'GENERAL'
    description TEXT,
    terms_and_conditions TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    target_type VARCHAR(50) NOT NULL DEFAULT 'WHOLE_SCHOOL', -- 'WHOLE_SCHOOL', 'GRADE', 'STREAM', 'INDIVIDUAL'
    target_class_ids JSONB DEFAULT '[]'::jsonb,
    target_student_ids JSONB DEFAULT '[]'::jsonb,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'
    created_by_user_id VARCHAR(100),
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_consent_school ON parent_consent_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_consent_status ON parent_consent_requests(school_id, status);
CREATE INDEX IF NOT EXISTS idx_parent_consent_category ON parent_consent_requests(category);

-- 2. Parent Consent Responses (Immutable parent responses and signatures)
CREATE TABLE IF NOT EXISTS parent_consent_responses (
    id VARCHAR(100) PRIMARY KEY,
    school_id VARCHAR(100) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    consent_request_id VARCHAR(100) NOT NULL REFERENCES parent_consent_requests(id) ON DELETE CASCADE,
    consent_version INT NOT NULL DEFAULT 1,
    student_id VARCHAR(100) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_guardian_id VARCHAR(100),
    parent_name VARCHAR(255) NOT NULL,
    parent_relationship VARCHAR(50) DEFAULT 'PARENT',
    parent_national_id VARCHAR(50),
    parent_phone VARCHAR(50),
    decision VARCHAR(50) NOT NULL, -- 'CONSENTED', 'DECLINED'
    notes TEXT,
    signature_type VARCHAR(50) DEFAULT 'DRAWN', -- 'DRAWN', 'TYPED', 'UPLOADED', 'SAVED_PROFILE'
    signature_data TEXT,
    signature_hash VARCHAR(128),
    ip_address VARCHAR(100),
    user_agent TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_response_id VARCHAR(100),
    is_latest BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_resp_request ON parent_consent_responses(consent_request_id);
CREATE INDEX IF NOT EXISTS idx_consent_resp_student ON parent_consent_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_consent_resp_parent ON parent_consent_responses(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_consent_resp_latest ON parent_consent_responses(consent_request_id, student_id, is_latest);

-- 3. Add dispute columns to payroll_records
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS disputed_by_user_id VARCHAR(100);

-- 4. Seed initial standard consent requests for Grace Seeds School demo
INSERT INTO parent_consent_requests (
    id, school_id, title, category, description, terms_and_conditions, version, target_type, is_mandatory, deadline, status, created_by_name, created_at, updated_at
) VALUES (
    'consent-req-001',
    'school-001',
    'Annual Academic Field Trips & Educational Excursions Consent (2026)',
    'TRIP',
    'Parental permission for learner participation in curriculum-aligned educational excursions, museum visits, and geographic field studies.',
    'I, being the lawful parent/guardian of the specified learner, hereby grant permission for the child to participate in supervised academic and cultural field excursions organized by Grace Seeds School during the 2026 academic calendar. I authorize designated school educators and licensed school transport chaperones to supervise my child. In the event of an emergency requiring immediate medical attention, school personnel are authorized to secure reasonable emergency first aid and care. All school policies and the Constitution of Kenya Child Protection safeguards apply.',
    1,
    'WHOLE_SCHOOL',
    true,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'PUBLISHED',
    'Grace Seeds Administration Office',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
), (
    'consent-req-002',
    'school-001',
    'Emergency Medical Treatment & Healthcare Authorization',
    'MEDICAL',
    'Authorization for school medical team and certified emergency health practitioners to administer first aid, prescribed medication, and hospital referral if needed.',
    'I authorize the Grace Seeds School infirmary nurse, certified staff first aiders, and contracted healthcare emergency partners to administer necessary first aid and emergency clinical support to my child in case of acute illness or sudden injury during school hours or official school activities. I agree to disclose all known chronic ailments, medical allergies, and emergency contact directives to ensure the child is properly cared for in accordance with Article 53 of the Constitution of Kenya.',
    1,
    'WHOLE_SCHOOL',
    true,
    CURRENT_TIMESTAMP + INTERVAL '60 days',
    'PUBLISHED',
    'School Health & Welfare Officer',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
), (
    'consent-req-003',
    'school-001',
    'Photography, Video Recording & Media Publication Consent',
    'MEDIA',
    'Permission for the learner to appear in school newsletters, educational e-diaries, academic portfolios, and official school publications.',
    'I consent / decline the capture and ethical use of photographic images and educational video recordings of my child participating in school events, academic exhibitions, music festivals, and sports competitions for official Grace Seeds School newsletters, visual CBC portfolios, and secure school communication channels. No child commercial exploitation or personal contact data shall ever be disclosed, strictly adhering to the Data Protection Act (2019) and Kenyan Child Online Protection Guidelines.',
    1,
    'WHOLE_SCHOOL',
    false,
    CURRENT_TIMESTAMP + INTERVAL '45 days',
    'PUBLISHED',
    'Director of Communications',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

COMMIT;
