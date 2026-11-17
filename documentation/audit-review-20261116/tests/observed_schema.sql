-- SYNTHETIC schema-only fixture derived from audit Q003/Q004. No production rows.
-- varchar lengths are not captured by Q003; this fixture does not verify length limits.
CREATE TABLE public."academic_terms" (
 "id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_number" integer NOT NULL,
 "name" varchar NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar NOT NULL,
 "is_current" boolean DEFAULT false,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."academic_years" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar NOT NULL,
 "is_current" boolean DEFAULT false,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."attendance_registers" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "date" varchar NOT NULL,
 "type" varchar NOT NULL,
 "lesson_id" varchar,
 "marked_by_teacher_id" varchar NOT NULL,
 "entries" jsonb NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."biometric_credentials" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "credential_id" text NOT NULL,
 "public_key" text NOT NULL,
 "counter" bigint DEFAULT 0 NOT NULL,
 "device_label" varchar NOT NULL,
 "device_type" varchar DEFAULT 'platform_generic'::character varying NOT NULL,
 "transports" text[] DEFAULT '{}'::text[],
 "aaguid" varchar,
 "backup_eligible" boolean DEFAULT false,
 "backup_state" boolean DEFAULT false,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "last_used_at" timestamp with time zone
);
CREATE TABLE public."book_loans" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "book_id" varchar NOT NULL,
 "book_title" varchar NOT NULL,
 "borrower_type" varchar DEFAULT 'STUDENT'::character varying NOT NULL,
 "borrower_id" varchar NOT NULL,
 "borrower_name" varchar NOT NULL,
 "borrower_admission_or_number" varchar,
 "borrower_grade_or_class" varchar,
 "issue_date" varchar NOT NULL,
 "due_date" varchar NOT NULL,
 "return_date" varchar,
 "status" varchar DEFAULT 'ISSUED'::character varying NOT NULL,
 "fine_amount" numeric DEFAULT 0 NOT NULL,
 "fine_paid" boolean DEFAULT false NOT NULL,
 "remarks" text,
 "issued_by_user_id" varchar,
 "received_by_user_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."books" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "author" varchar NOT NULL,
 "isbn" varchar,
 "category" varchar DEFAULT 'CBC Textbooks'::character varying NOT NULL,
 "publisher" varchar,
 "publication_year" integer,
 "copies_total" integer DEFAULT 1 NOT NULL,
 "copies_available" integer DEFAULT 1 NOT NULL,
 "shelf_location" varchar,
 "condition" varchar DEFAULT 'GOOD'::character varying NOT NULL,
 "grade_level" varchar,
 "cover_image_url" text,
 "description" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."bulk_billing_batches" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "scope" varchar NOT NULL,
 "target_grade_level" varchar,
 "total_eligible" integer DEFAULT 0,
 "total_generated" integer DEFAULT 0,
 "total_skipped" integer DEFAULT 0,
 "total_failed" integer DEFAULT 0,
 "total_amount_billed" numeric DEFAULT 0,
 "status" varchar DEFAULT 'COMPLETED'::character varying,
 "execution_summary" jsonb DEFAULT '{}'::jsonb,
 "created_by_user_id" varchar,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."cbc_report_cards" (
 "id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "stream_id" varchar,
 "learning_area_assessments" jsonb NOT NULL,
 "core_competency_assessments" jsonb NOT NULL,
 "value_assessments" jsonb NOT NULL,
 "attendance_days_present" integer NOT NULL,
 "attendance_days_total" integer NOT NULL,
 "class_teacher_remarks" text NOT NULL,
 "head_teacher_remarks" text NOT NULL,
 "overall_average_score" numeric NOT NULL,
 "overall_performance_level" varchar NOT NULL,
 "closing_date" varchar,
 "next_term_opening_date" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "class_position" integer,
 "class_population" integer,
 "stream_position" integer,
 "stream_population" integer,
 "overall_position" integer,
 "overall_population" integer,
 "total_marks" numeric,
 "mean_points" numeric,
 "mean_grade" varchar
);
CREATE TABLE public."class_teacher_assignments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "teacher_id" varchar NOT NULL,
 "assigned_by_user_id" varchar,
 "effective_from" varchar,
 "effective_to" varchar,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."classrooms" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "education_level" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."complaints" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "description" text NOT NULL,
 "category" varchar DEFAULT 'GENERAL'::character varying,
 "priority" varchar DEFAULT 'MEDIUM'::character varying,
 "status" varchar DEFAULT 'OPEN'::character varying,
 "complainant_name" varchar,
 "complainant_role" varchar,
 "complainant_phone" varchar,
 "complainant_email" varchar,
 "complainant_student_id" varchar,
 "assigned_to_user_id" varchar,
 "resolution_notes" text,
 "resolved_by_user_id" varchar,
 "resolved_at" timestamp without time zone,
 "created_by_user_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."curriculum_planning_config" (
 "key" text NOT NULL,
 "school_id" varchar NOT NULL,
 "kind" text NOT NULL,
 "revision" integer NOT NULL,
 "data" jsonb NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."curriculum_trackers" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "teacher_name" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "subject_name" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "class_name" varchar NOT NULL,
 "stream_id" varchar,
 "stream_name" varchar,
 "academic_year" varchar NOT NULL,
 "term" varchar NOT NULL,
 "total_weeks" integer DEFAULT 12 NOT NULL,
 "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "status" varchar DEFAULT 'ACTIVE'::character varying NOT NULL,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "daily_logs" jsonb DEFAULT '[]'::jsonb NOT NULL
);
CREATE TABLE public."deleted_students" (
 "id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "admission_number" varchar NOT NULL,
 "first_name" varchar NOT NULL,
 "middle_name" varchar,
 "last_name" varchar NOT NULL,
 "upi_number" varchar,
 "school_id" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "classroom_id" varchar,
 "stream_id" varchar,
 "academic_year_id" varchar,
 "student_data" jsonb NOT NULL,
 "linked_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "pending_work_cleared" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "deleted_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "deleted_by_user_id" varchar,
 "reason" text,
 "retention_policy_years" integer DEFAULT 7,
 "retention_expires_at" timestamp without time zone,
 "archived_at" timestamp without time zone DEFAULT now()
);
CREATE TABLE public."document_signature_records" (
 "id" varchar NOT NULL,
 "document_id" varchar NOT NULL,
 "document_type" varchar NOT NULL,
 "document_version" varchar NOT NULL,
 "document_hash" varchar NOT NULL,
 "signature_profile_id" varchar NOT NULL,
 "signature_profile_version" integer NOT NULL,
 "signature_data_snapshot" text NOT NULL,
 "signature_type" varchar NOT NULL,
 "signer_user_id" varchar NOT NULL,
 "signer_name" varchar NOT NULL,
 "signer_role" varchar NOT NULL,
 "signer_email" varchar NOT NULL,
 "otp_challenge_id" varchar NOT NULL,
 "signed_at" timestamp with time zone DEFAULT now() NOT NULL,
 "ip_address" varchar,
 "user_agent" text,
 "audit_metadata" jsonb
);
CREATE TABLE public."document_signing_batch_items" (
 "id" varchar NOT NULL,
 "batch_id" varchar NOT NULL,
 "document_id" varchar NOT NULL,
 "document_title" varchar NOT NULL,
 "student_id" varchar,
 "student_name" varchar,
 "document_version" varchar NOT NULL,
 "document_hash" varchar NOT NULL,
 "status" varchar DEFAULT 'READY'::character varying NOT NULL,
 "failure_reason" text,
 "signature_record_id" varchar,
 "signed_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."document_signing_batches" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "signatory_role" varchar NOT NULL,
 "document_type" varchar NOT NULL,
 "scope_description" varchar NOT NULL,
 "total_count" integer DEFAULT 0 NOT NULL,
 "signed_count" integer DEFAULT 0 NOT NULL,
 "failed_count" integer DEFAULT 0 NOT NULL,
 "status" varchar DEFAULT 'PREPARED'::character varying NOT NULL,
 "batch_digest" varchar NOT NULL,
 "otp_challenge_id" varchar,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "completed_at" timestamp with time zone
);
CREATE TABLE public."document_signing_challenges" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "document_id" varchar NOT NULL,
 "document_type" varchar NOT NULL,
 "document_version" varchar NOT NULL,
 "document_hash" varchar NOT NULL,
 "otp_hash" varchar NOT NULL,
 "salt" varchar NOT NULL,
 "attempts" integer DEFAULT 0 NOT NULL,
 "max_attempts" integer DEFAULT 5 NOT NULL,
 "expires_at" timestamp with time zone NOT NULL,
 "resend_cooldown_until" timestamp with time zone NOT NULL,
 "is_consumed" boolean DEFAULT false NOT NULL,
 "consumed_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."ediary_entries" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "classroom_id" varchar,
 "stream_id" varchar NOT NULL,
 "student_id" varchar,
 "teacher_id" varchar NOT NULL,
 "teacher_name" varchar,
 "academic_year_id" varchar,
 "term_id" varchar,
 "date" varchar NOT NULL,
 "title" varchar NOT NULL,
 "homework" text,
 "homework_tasks" jsonb DEFAULT '[]'::jsonb,
 "teacher_remarks" text,
 "requirements_tomorrow" text,
 "tomorrow_requirements" jsonb DEFAULT '[]'::jsonb,
 "acknowledgements" jsonb DEFAULT '[]'::jsonb,
 "status" varchar DEFAULT 'PUBLISHED'::character varying,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."expenses" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "voucher_number" varchar NOT NULL,
 "category" varchar NOT NULL,
 "title" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "payment_method" varchar NOT NULL,
 "payment_reference" varchar NOT NULL,
 "payee" varchar NOT NULL,
 "expense_date" varchar NOT NULL,
 "status" varchar NOT NULL,
 "notes" text,
 "recorded_by_user_id" varchar NOT NULL,
 "approved_by_user_id" varchar,
 "receipt_url" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."fee_banner_configs" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "deadline_date" varchar NOT NULL,
 "banner_title" varchar NOT NULL,
 "custom_message" text,
 "paybill_number" varchar,
 "bank_account_number" varchar,
 "bank_name" varchar,
 "is_enabled" boolean DEFAULT true,
 "show_only_to_defaulters" boolean DEFAULT true,
 "academic_term_id" varchar,
 "academic_year_id" varchar,
 "updated_by_user_id" varchar,
 "updated_by_user_name" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."fee_credit_applications" (
 "id" varchar NOT NULL,
 "credit_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "invoice_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "amount_applied" numeric NOT NULL,
 "applied_by_user_id" varchar,
 "applied_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."fee_structures" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar,
 "grade_level" varchar NOT NULL,
 "title" varchar NOT NULL,
 "items" jsonb NOT NULL,
 "due_date" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."financial_approval_requests" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "action_type" varchar NOT NULL,
 "target_record_type" varchar NOT NULL,
 "target_record_id" varchar NOT NULL,
 "requesting_user_id" varchar NOT NULL,
 "requesting_user_name" varchar,
 "approver_user_id" varchar,
 "approver_destination" varchar NOT NULL,
 "channel" varchar NOT NULL,
 "code_hash" varchar NOT NULL,
 "original_data" jsonb DEFAULT '{}'::jsonb,
 "proposed_data" jsonb DEFAULT '{}'::jsonb,
 "reason" text NOT NULL,
 "status" varchar DEFAULT 'PENDING'::character varying,
 "attempts" integer DEFAULT 0,
 "expires_at" timestamp without time zone NOT NULL,
 "approved_at" timestamp without time zone,
 "rejected_at" timestamp without time zone,
 "rejection_reason" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."fixed_assets" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "asset_name" varchar NOT NULL,
 "asset_tag" varchar NOT NULL,
 "category" varchar NOT NULL,
 "purchase_date" date NOT NULL,
 "purchase_cost" numeric NOT NULL,
 "location" varchar NOT NULL,
 "condition" varchar DEFAULT 'EXCELLENT'::character varying NOT NULL,
 "assigned_to" varchar,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."formative_assessments" (
 "id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "sub_strand_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "assessment_date" varchar NOT NULL,
 "assessment_method" varchar NOT NULL,
 "performance_level" varchar NOT NULL,
 "specific_outcome_tested" text NOT NULL,
 "teacher_remarks" text,
 "evidence_notes" text,
 "targeted_competencies" jsonb DEFAULT '[]'::jsonb,
 "values_observed" jsonb DEFAULT '[]'::jsonb,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."global_subjects" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "code" varchar NOT NULL,
 "name" varchar NOT NULL,
 "department" varchar,
 "description" text,
 "created_at" timestamp without time zone DEFAULT now(),
 "updated_at" timestamp without time zone DEFAULT now()
);
CREATE TABLE public."goods_received_notes" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "grn_number" varchar NOT NULL,
 "purchase_request_id" varchar NOT NULL,
 "item_id" varchar NOT NULL,
 "item_name" varchar NOT NULL,
 "delivery_note_ref" varchar,
 "quantity_ordered" numeric NOT NULL,
 "quantity_delivered" numeric NOT NULL,
 "quantity_accepted" numeric NOT NULL,
 "quantity_rejected" numeric DEFAULT 0.00 NOT NULL,
 "rejection_reason" text,
 "received_by_user_id" varchar NOT NULL,
 "received_by_name" varchar NOT NULL,
 "received_date" date NOT NULL,
 "delivery_status" varchar DEFAULT 'FULL'::character varying NOT NULL,
 "notes" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."guardians" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "national_id" varchar,
 "occupation" varchar,
 "relationship" varchar NOT NULL,
 "emergency_contact" varchar NOT NULL,
 "student_ids" jsonb DEFAULT '[]'::jsonb,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."inventory_items" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "item_name" varchar NOT NULL,
 "category" varchar NOT NULL,
 "unit" varchar NOT NULL,
 "quantity_in_stock" numeric DEFAULT 0.00 NOT NULL,
 "reorder_level" numeric DEFAULT 10.00 NOT NULL,
 "unit_cost" numeric DEFAULT 0.00 NOT NULL,
 "supplier" varchar,
 "notes" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."inventory_purchase_requests" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "request_number" varchar NOT NULL,
 "item_id" varchar NOT NULL,
 "item_name" varchar NOT NULL,
 "category" varchar NOT NULL,
 "quantity_requested" numeric NOT NULL,
 "estimated_unit_cost" numeric NOT NULL,
 "total_estimated_cost" numeric NOT NULL,
 "requested_by_user_id" varchar NOT NULL,
 "requested_by_name" varchar NOT NULL,
 "requested_by_email" varchar,
 "reason" text NOT NULL,
 "supporting_document_url" text,
 "status" varchar DEFAULT 'REQUESTED'::character varying NOT NULL,
 "approved_by_user_id" varchar,
 "approved_by_name" varchar,
 "approved_at" timestamp with time zone,
 "approval_notes" text,
 "rejection_reason" text,
 "delivered_quantity" numeric DEFAULT 0.00 NOT NULL,
 "supplier_name" varchar,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."inventory_stock_movements" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "item_id" varchar NOT NULL,
 "item_name" varchar NOT NULL,
 "movement_type" varchar NOT NULL,
 "quantity" numeric NOT NULL,
 "balance_before" numeric NOT NULL,
 "balance_after" numeric NOT NULL,
 "reference_id" varchar,
 "reference_type" varchar,
 "issued_to" varchar,
 "purpose" text,
 "reason" text NOT NULL,
 "recorded_by_user_id" varchar NOT NULL,
 "recorded_by_name" varchar NOT NULL,
 "authorized_by_user_id" varchar NOT NULL,
 "authorized_by_name" varchar NOT NULL,
 "date" date NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."inventory_supplier_invoices" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "supplier_name" varchar NOT NULL,
 "invoice_number" varchar NOT NULL,
 "purchase_request_id" varchar,
 "invoice_date" date NOT NULL,
 "due_date" date,
 "total_amount" numeric NOT NULL,
 "tax_amount" numeric DEFAULT 0.00 NOT NULL,
 "amount_paid" numeric DEFAULT 0.00 NOT NULL,
 "balance" numeric NOT NULL,
 "payment_status" varchar DEFAULT 'UNPAID'::character varying NOT NULL,
 "funding_account" varchar,
 "expense_id" varchar,
 "voucher_number" varchar,
 "payment_method" varchar,
 "payment_reference" varchar,
 "paid_by_user_id" varchar,
 "paid_at" timestamp with time zone,
 "verified_by_user_id" varchar,
 "verified_at" timestamp with time zone,
 "document_url" text,
 "notes" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."invoice_test_payment_reset_backup_20261108" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "fee_structure_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "invoice_number" varchar NOT NULL,
 "items" jsonb NOT NULL,
 "amount_billed" numeric NOT NULL,
 "discount_amount" numeric DEFAULT 0,
 "amount_payable" numeric NOT NULL,
 "amount_paid" numeric DEFAULT 0,
 "balance" numeric NOT NULL,
 "status" varchar DEFAULT 'UNPAID'::character varying,
 "due_date" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."learning_areas" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "code" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "education_level" varchar NOT NULL,
 "is_elective" boolean DEFAULT false,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "global_subject_id" varchar
);
CREATE TABLE public."lesson_plans" (
 "id" varchar NOT NULL,
 "scheme_of_work_entry_id" varchar,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "lesson_date" varchar NOT NULL,
 "duration_minutes" integer DEFAULT 40,
 "roll_boys" integer,
 "roll_girls" integer,
 "strand" varchar NOT NULL,
 "sub_strand" varchar NOT NULL,
 "specific_learning_outcomes" jsonb DEFAULT '[]'::jsonb,
 "key_inquiry_questions" jsonb DEFAULT '[]'::jsonb,
 "core_competencies_addressed" jsonb DEFAULT '[]'::jsonb,
 "values_addressed" jsonb DEFAULT '[]'::jsonb,
 "learning_resources" jsonb DEFAULT '[]'::jsonb,
 "steps" jsonb NOT NULL,
 "extended_activity" text,
 "teacher_self_reflection" text,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "lesson_details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE public."lunch_enrollments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "academic_year_id" varchar,
 "term_id" varchar,
 "plan_name" varchar DEFAULT 'Standard Lunch'::character varying NOT NULL,
 "amount" numeric DEFAULT 0 NOT NULL,
 "amount_paid" numeric DEFAULT 0 NOT NULL,
 "balance" numeric DEFAULT 0 NOT NULL,
 "payment_status" varchar DEFAULT 'UNPAID'::character varying NOT NULL,
 "dietary_notes" text,
 "status" varchar DEFAULT 'ACTIVE'::character varying NOT NULL,
 "notes" text,
 "enrolled_by_user_id" varchar,
 "enrolled_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "payment_frequency" varchar DEFAULT 'TERMLY'::character varying,
 "daily_rate" numeric DEFAULT 0
);
CREATE TABLE public."lunch_expenses" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "category" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "expense_date" varchar NOT NULL,
 "payment_method" varchar NOT NULL,
 "payment_reference" varchar,
 "vendor_payee" varchar NOT NULL,
 "receipt_voucher_number" varchar,
 "term_id" varchar,
 "academic_year_id" varchar,
 "recorded_by_user_id" varchar,
 "recorded_by_user_name" varchar,
 "notes" text,
 "receipt_url" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."lunch_payments" (
 "id" varchar NOT NULL,
 "lunch_enrollment_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "receipt_number" varchar NOT NULL,
 "payment_method" varchar NOT NULL,
 "transaction_reference" varchar NOT NULL,
 "payment_date" varchar NOT NULL,
 "recorded_by_user_id" varchar,
 "notes" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "is_reversed" boolean DEFAULT false,
 "reversed_at" timestamp without time zone,
 "reversed_by_user_id" varchar,
 "reversal_reason" text,
 "reversal_audit_metadata" jsonb,
 "idempotency_key" varchar
);
CREATE TABLE public."occurrence_records" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "occurrence_number" varchar NOT NULL,
 "title" varchar NOT NULL,
 "description" text NOT NULL,
 "category" varchar NOT NULL,
 "severity" varchar NOT NULL,
 "date" varchar NOT NULL,
 "time" varchar NOT NULL,
 "location" varchar NOT NULL,
 "reported_by_teacher_id" varchar NOT NULL,
 "reported_by_teacher_name" varchar NOT NULL,
 "reported_by_role" varchar,
 "student_ids" jsonb DEFAULT '[]'::jsonb,
 "student_names" jsonb DEFAULT '[]'::jsonb,
 "witnesses" text,
 "immediate_action_taken" text,
 "status" varchar DEFAULT 'OPEN'::character varying,
 "resolution_notes" text,
 "resolved_by" varchar,
 "resolved_at" timestamp without time zone,
 "parent_notified" boolean DEFAULT false,
 "parent_notification_method" varchar DEFAULT 'NONE'::character varying,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."other_incomes" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "receipt_number" varchar NOT NULL,
 "source" varchar NOT NULL,
 "title" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "payment_method" varchar NOT NULL,
 "payment_reference" varchar NOT NULL,
 "received_from" varchar NOT NULL,
 "income_date" varchar NOT NULL,
 "notes" text,
 "recorded_by_user_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."parent_consent_requests" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "category" varchar DEFAULT 'GENERAL'::character varying NOT NULL,
 "description" text,
 "terms_and_conditions" text NOT NULL,
 "version" integer DEFAULT 1 NOT NULL,
 "target_type" varchar DEFAULT 'WHOLE_SCHOOL'::character varying NOT NULL,
 "target_class_ids" jsonb DEFAULT '[]'::jsonb,
 "target_student_ids" jsonb DEFAULT '[]'::jsonb,
 "is_mandatory" boolean DEFAULT true NOT NULL,
 "deadline" timestamp with time zone,
 "status" varchar DEFAULT 'PUBLISHED'::character varying NOT NULL,
 "created_by_user_id" varchar,
 "created_by_name" varchar,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."parent_consent_responses" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "consent_request_id" varchar NOT NULL,
 "consent_version" integer DEFAULT 1 NOT NULL,
 "student_id" varchar NOT NULL,
 "parent_user_id" varchar NOT NULL,
 "parent_guardian_id" varchar,
 "parent_name" varchar NOT NULL,
 "parent_relationship" varchar DEFAULT 'PARENT'::character varying,
 "parent_national_id" varchar,
 "parent_phone" varchar,
 "decision" varchar NOT NULL,
 "notes" text,
 "signature_type" varchar DEFAULT 'DRAWN'::character varying,
 "signature_data" text,
 "signature_hash" varchar,
 "ip_address" varchar,
 "user_agent" text,
 "submitted_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "previous_response_id" varchar,
 "is_latest" boolean DEFAULT true NOT NULL,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."payments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "invoice_id" varchar,
 "student_id" varchar NOT NULL,
 "receipt_number" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "payment_method" varchar NOT NULL,
 "transaction_reference" varchar NOT NULL,
 "mpesa_phone_number" varchar,
 "payment_date" varchar NOT NULL,
 "recorded_by_user_id" varchar NOT NULL,
 "status" varchar DEFAULT 'COMPLETED'::character varying,
 "notes" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "arrears_paid" numeric DEFAULT 0,
 "current_fees_paid" numeric DEFAULT 0,
 "overpayment_amount" numeric DEFAULT 0,
 "allocation_breakdown" jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE public."payroll_records" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "teacher_name" varchar NOT NULL,
 "month" varchar NOT NULL,
 "basic_salary" numeric NOT NULL,
 "house_allowance" numeric DEFAULT 0 NOT NULL,
 "commuter_allowance" numeric DEFAULT 0 NOT NULL,
 "responsibility_allowance" numeric DEFAULT 0 NOT NULL,
 "gross_salary" numeric NOT NULL,
 "nssf" numeric DEFAULT 0 NOT NULL,
 "shif" numeric DEFAULT 0 NOT NULL,
 "housing_levy" numeric DEFAULT 0 NOT NULL,
 "paye" numeric DEFAULT 0 NOT NULL,
 "other_deductions" numeric DEFAULT 0 NOT NULL,
 "total_deductions" numeric DEFAULT 0 NOT NULL,
 "net_salary" numeric NOT NULL,
 "status" varchar DEFAULT 'DRAFT'::character varying NOT NULL,
 "amount_paid" numeric DEFAULT 0 NOT NULL,
 "balance" numeric DEFAULT 0 NOT NULL,
 "payment_method" varchar,
 "payment_reference" varchar,
 "funding_account" varchar,
 "expense_id" varchar,
 "voucher_number" varchar,
 "paid_at" timestamp without time zone,
 "approved_by_user_id" varchar,
 "approved_at" timestamp without time zone,
 "paid_by_user_id" varchar,
 "reversed_by_user_id" varchar,
 "reversed_at" timestamp without time zone,
 "reversal_reason" text,
 "notes" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "disputed_at" timestamp with time zone,
 "dispute_reason" text,
 "disputed_by_user_id" varchar
);
CREATE TABLE public."records_of_work" (
 "id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "academic_year_id" varchar,
 "term_id" varchar,
 "week" integer NOT NULL,
 "day" varchar NOT NULL,
 "period" varchar,
 "subject_and_grade" varchar NOT NULL,
 "strand_and_work_covered" text NOT NULL,
 "reference" text NOT NULL,
 "comments" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "reflection" text,
 "school_id" varchar DEFAULT 'school-001'::character varying,
 "teacher_name" varchar,
 "academic_year" varchar,
 "term" varchar,
 "classroom_id" varchar,
 "class_name" varchar,
 "stream_id" varchar,
 "stream_name" varchar,
 "learning_area_id" varchar,
 "subject_name" varchar,
 "strand_id" varchar,
 "strand" varchar,
 "sub_strand_id" varchar,
 "sub_strand" varchar,
 "week_number" integer DEFAULT 1,
 "lesson_period" varchar,
 "lesson_date" date,
 "lesson_topic" text,
 "learning_objectives" text,
 "learning_activities" text,
 "resources" text,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "reflection_data" jsonb DEFAULT '{}'::jsonb,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_by_name" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "return_reason" text,
 "tracker_id" varchar,
 "is_official_coverage" boolean DEFAULT false,
 "planning_link" jsonb
);
CREATE TABLE public."schemes_of_work" (
 "id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "entries" jsonb NOT NULL,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "planning_state" jsonb
);
CREATE TABLE public."schools" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "code" varchar NOT NULL,
 "center_code" varchar,
 "motto" text,
 "email" varchar NOT NULL,
 "phone" varchar NOT NULL,
 "address" text NOT NULL,
 "logo_url" text,
 "currency" varchar DEFAULT 'KES'::character varying,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "latitude" double precision,
 "longitude" double precision,
 "geofence_radius" double precision DEFAULT 250,
 "geofence_enabled" boolean DEFAULT true,
 "school_type" varchar DEFAULT 'DAY'::character varying
);
CREATE TABLE public."signature_policies" (
 "id" varchar NOT NULL,
 "document_type" varchar NOT NULL,
 "title" varchar NOT NULL,
 "description" text,
 "requires_signature" boolean DEFAULT true NOT NULL,
 "allowed_roles" text[] NOT NULL,
 "required_signatures_count" integer DEFAULT 1 NOT NULL,
 "signing_order" varchar DEFAULT 'PARALLEL'::character varying NOT NULL,
 "allow_bulk_signing" boolean DEFAULT false NOT NULL,
 "placements" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."signature_profiles" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "signature_type" varchar NOT NULL,
 "signature_data" text NOT NULL,
 "font_style" varchar,
 "consent_given" boolean DEFAULT true NOT NULL,
 "consent_given_at" timestamp with time zone DEFAULT now() NOT NULL,
 "is_active" boolean DEFAULT true NOT NULL,
 "version" integer DEFAULT 1 NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."staff_leaves" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "teacher_name" varchar NOT NULL,
 "leave_type" varchar NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar NOT NULL,
 "days_count" integer NOT NULL,
 "reason" text NOT NULL,
 "status" varchar DEFAULT 'PENDING'::character varying NOT NULL,
 "approved_by" varchar,
 "approval_remarks" text,
 "substitute_teacher_id" varchar,
 "substitute_teacher_name" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."stock_transactions" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "item_id" varchar NOT NULL,
 "item_name" varchar NOT NULL,
 "type" varchar NOT NULL,
 "quantity" numeric NOT NULL,
 "issued_to" varchar,
 "authorized_by" varchar NOT NULL,
 "date" date NOT NULL,
 "notes" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."strands" (
 "id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "code" varchar NOT NULL,
 "title" varchar NOT NULL,
 "description" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."streams" (
 "id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "capacity" integer NOT NULL,
 "class_teacher_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."student_fee_credits" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "originating_payment_id" varchar,
 "originating_receipt_number" varchar,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "amount" numeric NOT NULL,
 "amount_used" numeric DEFAULT 0,
 "balance" numeric NOT NULL,
 "status" varchar DEFAULT 'AVAILABLE'::character varying,
 "notes" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."student_fee_credits_test_cleanup_backup_20261105" (
 "id" varchar,
 "school_id" varchar,
 "student_id" varchar,
 "originating_payment_id" varchar,
 "originating_receipt_number" varchar,
 "academic_year_id" varchar,
 "term_id" varchar,
 "amount" numeric,
 "amount_used" numeric,
 "balance" numeric,
 "status" varchar,
 "notes" text,
 "created_at" timestamp without time zone,
 "updated_at" timestamp without time zone
);
CREATE TABLE public."student_invoices" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "fee_structure_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "invoice_number" varchar NOT NULL,
 "items" jsonb NOT NULL,
 "amount_billed" numeric NOT NULL,
 "discount_amount" numeric DEFAULT 0,
 "amount_payable" numeric NOT NULL,
 "amount_paid" numeric DEFAULT 0,
 "balance" numeric NOT NULL,
 "status" varchar DEFAULT 'UNPAID'::character varying,
 "due_date" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."student_parent_links" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "parent_user_id" varchar NOT NULL,
 "guardian_id" varchar,
 "student_id" varchar NOT NULL,
 "relationship_type" varchar DEFAULT 'PARENT'::character varying,
 "is_primary" boolean DEFAULT true,
 "can_view_academics" boolean DEFAULT true,
 "can_view_finances" boolean DEFAULT true,
 "created_by_user_id" varchar,
 "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."student_sponsorships" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "admission_number" varchar NOT NULL,
 "student_name" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "stream_name" varchar,
 "gender" varchar,
 "sponsorship_type" varchar NOT NULL,
 "sponsorship_status" varchar DEFAULT 'ACTIVE'::character varying NOT NULL,
 "coverage" jsonb DEFAULT '{"lunchCovered": false, "tuitionCovered": true, "uniformCovered": false, "materialsCovered": true, "activitiesCovered": true, "percentageCovered": 100}'::jsonb NOT NULL,
 "sponsor_name" varchar NOT NULL,
 "sponsor_contact" varchar,
 "termly_subsidy_amount" numeric DEFAULT 0 NOT NULL,
 "annual_subsidy_amount" numeric DEFAULT 0 NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar,
 "academic_year_id" varchar,
 "approval_reference" varchar NOT NULL,
 "approved_by_user_id" varchar NOT NULL,
 "approved_by_user_name" varchar NOT NULL,
 "reason_notes" text,
 "confidential_notes" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."student_sponsorships_backup_20261028_104417" (
 "id" varchar,
 "school_id" varchar,
 "student_id" varchar,
 "admission_number" varchar,
 "student_name" varchar,
 "grade_level" varchar,
 "stream_name" varchar,
 "gender" varchar,
 "sponsorship_type" varchar,
 "sponsorship_status" varchar,
 "coverage" jsonb,
 "sponsor_name" varchar,
 "sponsor_contact" varchar,
 "termly_subsidy_amount" numeric,
 "annual_subsidy_amount" numeric,
 "start_date" varchar,
 "end_date" varchar,
 "academic_year_id" varchar,
 "approval_reference" varchar,
 "approved_by_user_id" varchar,
 "approved_by_user_name" varchar,
 "reason_notes" text,
 "confidential_notes" text,
 "created_at" timestamp without time zone,
 "updated_at" timestamp without time zone
);
CREATE TABLE public."students" (
 "id" varchar NOT NULL,
 "admission_number" varchar NOT NULL,
 "upi_number" varchar,
 "first_name" varchar NOT NULL,
 "middle_name" varchar,
 "last_name" varchar NOT NULL,
 "date_of_birth" varchar NOT NULL,
 "gender" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "stream_id" varchar,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "guardian_ids" jsonb DEFAULT '[]'::jsonb,
 "medical_conditions" text,
 "special_needs" text,
 "status" varchar DEFAULT 'ACTIVE'::character varying,
 "profile_photo_url" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "classroom_id" varchar,
 "withdrawal_date" varchar,
 "withdrawal_reason" text,
 "destination_school" varchar,
 "withdrawn_by_user_id" varchar,
 "withdrawal_notes" text
);
CREATE TABLE public."students_backup_20261028_104417" (
 "id" varchar,
 "admission_number" varchar,
 "upi_number" varchar,
 "first_name" varchar,
 "middle_name" varchar,
 "last_name" varchar,
 "date_of_birth" varchar,
 "gender" varchar,
 "grade_level" varchar,
 "stream_id" varchar,
 "school_id" varchar,
 "academic_year_id" varchar,
 "guardian_ids" jsonb,
 "medical_conditions" text,
 "special_needs" text,
 "status" varchar,
 "profile_photo_url" text,
 "created_at" timestamp without time zone,
 "updated_at" timestamp without time zone,
 "classroom_id" varchar
);
CREATE TABLE public."sub_strands" (
 "id" varchar NOT NULL,
 "strand_id" varchar NOT NULL,
 "code" varchar NOT NULL,
 "title" varchar NOT NULL,
 "specific_learning_outcomes" jsonb DEFAULT '[]'::jsonb,
 "suggested_experiences" jsonb DEFAULT '[]'::jsonb,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."subject_teacher_assignments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "classroom_id" varchar,
 "stream_id" varchar,
 "learning_area_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "role" varchar DEFAULT 'SUBJECT_LEAD'::character varying NOT NULL,
 "assigned_by_user_id" varchar,
 "effective_from" varchar,
 "effective_to" varchar,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."summative_assessments" (
 "id" varchar NOT NULL,
 "student_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "strand_scores" jsonb NOT NULL,
 "overall_performance_level" varchar NOT NULL,
 "teacher_remarks" text NOT NULL,
 "evaluation_date" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."system_logs" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "level" varchar DEFAULT 'INFO'::character varying NOT NULL,
 "category" varchar DEFAULT 'SYSTEM'::character varying NOT NULL,
 "action" varchar NOT NULL,
 "actor_user_id" varchar,
 "actor_email" varchar,
 "actor_role" varchar,
 "ip_address" varchar,
 "status" varchar DEFAULT 'SUCCESS'::character varying NOT NULL,
 "details" text NOT NULL,
 "metadata" jsonb DEFAULT '{}'::jsonb,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "mac_address" varchar
);
CREATE TABLE public."teacher_clockins" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "teacher_name" varchar,
 "date" varchar NOT NULL,
 "clock_in_time" varchar,
 "clock_out_time" varchar,
 "status" varchar DEFAULT 'CLOCKED_IN'::character varying,
 "latitude" double precision,
 "longitude" double precision,
 "distance_meters" double precision,
 "in_compound" boolean DEFAULT true,
 "accuracy_meters" double precision,
 "verified_by" varchar DEFAULT 'GPS_GEOFENCE'::character varying,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."teacher_correction_requests" (
 "id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "field_name" varchar NOT NULL,
 "field_label" varchar NOT NULL,
 "current_value" text,
 "proposed_value" text NOT NULL,
 "reason" text NOT NULL,
 "evidence_url" text,
 "status" varchar DEFAULT 'PENDING'::character varying,
 "reviewed_by_user_id" varchar,
 "reviewed_by_name" varchar,
 "review_remarks" text,
 "reviewed_at" timestamp without time zone,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."teachers" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "tsc_number" varchar,
 "employee_number" varchar NOT NULL,
 "specialization" jsonb DEFAULT '[]'::jsonb,
 "assigned_class_stream_ids" jsonb DEFAULT '[]'::jsonb,
 "qualification" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "date_of_birth" varchar,
 "gender" varchar,
 "national_id" varchar,
 "residential_address" text,
 "profile_photo_url" text,
 "employment_date" varchar,
 "employment_type" varchar DEFAULT 'FULL_TIME'::character varying,
 "employment_status" varchar DEFAULT 'ACTIVE'::character varying,
 "department" varchar,
 "emergency_contact" jsonb DEFAULT '{}'::jsonb,
 "documents" jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE public."timetables" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "slots" jsonb NOT NULL,
 "is_active" boolean DEFAULT true,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "periods" jsonb,
 "days" jsonb
);
CREATE TABLE public."users" (
 "id" varchar NOT NULL,
 "email" varchar,
 "password_hash" varchar NOT NULL,
 "first_name" varchar NOT NULL,
 "last_name" varchar NOT NULL,
 "role" varchar NOT NULL,
 "phone" varchar,
 "status" varchar DEFAULT 'ACTIVE'::character varying,
 "school_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "must_change_password" boolean DEFAULT false,
 "reset_password_token" varchar,
 "reset_password_expires" timestamp without time zone,
 "reset_password_attempts" integer DEFAULT 0
);
ALTER TABLE public."academic_terms" ADD CONSTRAINT "academic_terms_pkey" PRIMARY KEY (id);
ALTER TABLE public."academic_years" ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY (id);
ALTER TABLE public."attendance_registers" ADD CONSTRAINT "attendance_registers_pkey" PRIMARY KEY (id);
ALTER TABLE public."biometric_credentials" ADD CONSTRAINT "biometric_credentials_credential_id_key" UNIQUE (credential_id);
ALTER TABLE public."biometric_credentials" ADD CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY (id);
ALTER TABLE public."book_loans" ADD CONSTRAINT "book_loans_pkey" PRIMARY KEY (id);
ALTER TABLE public."books" ADD CONSTRAINT "books_pkey" PRIMARY KEY (id);
ALTER TABLE public."bulk_billing_batches" ADD CONSTRAINT "bulk_billing_batches_pkey" PRIMARY KEY (id);
ALTER TABLE public."cbc_report_cards" ADD CONSTRAINT "cbc_report_cards_pkey" PRIMARY KEY (id);
ALTER TABLE public."class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."classrooms" ADD CONSTRAINT "classrooms_pkey" PRIMARY KEY (id);
ALTER TABLE public."complaints" ADD CONSTRAINT "complaints_pkey" PRIMARY KEY (id);
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_kind_check" CHECK ((kind = ANY (ARRAY['CALENDAR'::text, 'SEQUENCE'::text])));
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_pkey" PRIMARY KEY (key);
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_revision_check" CHECK ((revision > 0));
ALTER TABLE public."curriculum_trackers" ADD CONSTRAINT "curriculum_trackers_pkey" PRIMARY KEY (id);
ALTER TABLE public."deleted_students" ADD CONSTRAINT "deleted_students_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_signature_records" ADD CONSTRAINT "document_signature_records_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_signing_batch_items" ADD CONSTRAINT "document_signing_batch_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_signing_batches" ADD CONSTRAINT "document_signing_batches_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_signing_challenges" ADD CONSTRAINT "document_signing_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE public."ediary_entries" ADD CONSTRAINT "ediary_entries_pkey" PRIMARY KEY (id);
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_pkey" PRIMARY KEY (id);
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_voucher_number_key" UNIQUE (voucher_number);
ALTER TABLE public."fee_banner_configs" ADD CONSTRAINT "fee_banner_configs_pkey" PRIMARY KEY (id);
ALTER TABLE public."fee_banner_configs" ADD CONSTRAINT "fee_banner_configs_school_id_key" UNIQUE (school_id);
ALTER TABLE public."fee_credit_applications" ADD CONSTRAINT "fee_credit_applications_pkey" PRIMARY KEY (id);
ALTER TABLE public."fee_structures" ADD CONSTRAINT "fee_structures_pkey" PRIMARY KEY (id);
ALTER TABLE public."financial_approval_requests" ADD CONSTRAINT "financial_approval_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."fixed_assets" ADD CONSTRAINT "fixed_assets_asset_tag_key" UNIQUE (asset_tag);
ALTER TABLE public."fixed_assets" ADD CONSTRAINT "fixed_assets_pkey" PRIMARY KEY (id);
ALTER TABLE public."formative_assessments" ADD CONSTRAINT "formative_assessments_pkey" PRIMARY KEY (id);
ALTER TABLE public."global_subjects" ADD CONSTRAINT "global_subjects_pkey" PRIMARY KEY (id);
ALTER TABLE public."global_subjects" ADD CONSTRAINT "uq_global_subjects_school_code" UNIQUE (school_id, code);
ALTER TABLE public."goods_received_notes" ADD CONSTRAINT "goods_received_notes_grn_number_key" UNIQUE (grn_number);
ALTER TABLE public."goods_received_notes" ADD CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY (id);
ALTER TABLE public."guardians" ADD CONSTRAINT "guardians_pkey" PRIMARY KEY (id);
ALTER TABLE public."guardians" ADD CONSTRAINT "guardians_user_id_key" UNIQUE (user_id);
ALTER TABLE public."inventory_items" ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."inventory_purchase_requests" ADD CONSTRAINT "inventory_purchase_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."inventory_purchase_requests" ADD CONSTRAINT "inventory_purchase_requests_request_number_key" UNIQUE (request_number);
ALTER TABLE public."inventory_stock_movements" ADD CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY (id);
ALTER TABLE public."inventory_supplier_invoices" ADD CONSTRAINT "inventory_supplier_invoices_pkey" PRIMARY KEY (id);
ALTER TABLE public."inventory_supplier_invoices" ADD CONSTRAINT "uq_inv_supplier_invoice" UNIQUE (school_id, supplier_name, invoice_number);
ALTER TABLE public."invoice_test_payment_reset_backup_20261108" ADD CONSTRAINT "invoice_test_payment_reset_backup_20261108_invoice_number_key" UNIQUE (invoice_number);
ALTER TABLE public."invoice_test_payment_reset_backup_20261108" ADD CONSTRAINT "invoice_test_payment_reset_backup_20261108_pkey" PRIMARY KEY (id);
ALTER TABLE public."learning_areas" ADD CONSTRAINT "learning_areas_pkey" PRIMARY KEY (id);
ALTER TABLE public."learning_areas" ADD CONSTRAINT "unique_school_grade_subject_code" UNIQUE (school_id, grade_level, code);
ALTER TABLE public."lesson_plans" ADD CONSTRAINT "lesson_plans_pkey" PRIMARY KEY (id);
ALTER TABLE public."lunch_enrollments" ADD CONSTRAINT "lunch_enrollments_pkey" PRIMARY KEY (id);
ALTER TABLE public."lunch_expenses" ADD CONSTRAINT "lunch_expenses_pkey" PRIMARY KEY (id);
ALTER TABLE public."lunch_payments" ADD CONSTRAINT "lunch_payments_pkey" PRIMARY KEY (id);
ALTER TABLE public."lunch_payments" ADD CONSTRAINT "lunch_payments_receipt_number_key" UNIQUE (receipt_number);
ALTER TABLE public."occurrence_records" ADD CONSTRAINT "occurrence_records_pkey" PRIMARY KEY (id);
ALTER TABLE public."other_incomes" ADD CONSTRAINT "other_incomes_pkey" PRIMARY KEY (id);
ALTER TABLE public."other_incomes" ADD CONSTRAINT "other_incomes_receipt_number_key" UNIQUE (receipt_number);
ALTER TABLE public."parent_consent_requests" ADD CONSTRAINT "parent_consent_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."parent_consent_responses" ADD CONSTRAINT "parent_consent_responses_pkey" PRIMARY KEY (id);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_receipt_number_key" UNIQUE (receipt_number);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_transaction_reference_key" UNIQUE (transaction_reference);
ALTER TABLE public."payroll_records" ADD CONSTRAINT "payroll_records_pkey" PRIMARY KEY (id);
ALTER TABLE public."records_of_work" ADD CONSTRAINT "records_of_work_pkey" PRIMARY KEY (id);
ALTER TABLE public."schemes_of_work" ADD CONSTRAINT "schemes_of_work_pkey" PRIMARY KEY (id);
ALTER TABLE public."schemes_of_work" ADD CONSTRAINT "schemes_planning_state_object" CHECK (((planning_state IS NULL) OR (jsonb_typeof(planning_state) = 'object'::text))) NOT VALID;
ALTER TABLE public."schools" ADD CONSTRAINT "schools_code_key" UNIQUE (code);
ALTER TABLE public."schools" ADD CONSTRAINT "schools_pkey" PRIMARY KEY (id);
ALTER TABLE public."signature_policies" ADD CONSTRAINT "signature_policies_document_type_key" UNIQUE (document_type);
ALTER TABLE public."signature_policies" ADD CONSTRAINT "signature_policies_pkey" PRIMARY KEY (id);
ALTER TABLE public."signature_profiles" ADD CONSTRAINT "signature_profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."signature_profiles" ADD CONSTRAINT "signature_profiles_user_id_key" UNIQUE (user_id);
ALTER TABLE public."staff_leaves" ADD CONSTRAINT "staff_leaves_pkey" PRIMARY KEY (id);
ALTER TABLE public."stock_transactions" ADD CONSTRAINT "stock_transactions_pkey" PRIMARY KEY (id);
ALTER TABLE public."strands" ADD CONSTRAINT "strands_pkey" PRIMARY KEY (id);
ALTER TABLE public."streams" ADD CONSTRAINT "streams_pkey" PRIMARY KEY (id);
ALTER TABLE public."student_fee_credits" ADD CONSTRAINT "student_fee_credits_pkey" PRIMARY KEY (id);
ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_invoice_number_key" UNIQUE (invoice_number);
ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_pkey" PRIMARY KEY (id);
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "student_parent_links_pkey" PRIMARY KEY (id);
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "uq_student_parent_link" UNIQUE (school_id, parent_user_id, student_id);
ALTER TABLE public."student_sponsorships" ADD CONSTRAINT "student_sponsorships_pkey" PRIMARY KEY (id);
ALTER TABLE public."student_sponsorships" ADD CONSTRAINT "student_sponsorships_student_id_key" UNIQUE (student_id);
ALTER TABLE public."students" ADD CONSTRAINT "students_admission_number_key" UNIQUE (admission_number);
ALTER TABLE public."students" ADD CONSTRAINT "students_pkey" PRIMARY KEY (id);
ALTER TABLE public."students" ADD CONSTRAINT "students_upi_number_key" UNIQUE (upi_number);
ALTER TABLE public."sub_strands" ADD CONSTRAINT "sub_strands_pkey" PRIMARY KEY (id);
ALTER TABLE public."subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."summative_assessments" ADD CONSTRAINT "summative_assessments_pkey" PRIMARY KEY (id);
ALTER TABLE public."system_logs" ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY (id);
ALTER TABLE public."teacher_clockins" ADD CONSTRAINT "teacher_clockins_pkey" PRIMARY KEY (id);
ALTER TABLE public."teacher_correction_requests" ADD CONSTRAINT "teacher_correction_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_employee_number_key" UNIQUE (employee_number);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_pkey" PRIMARY KEY (id);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_user_id_key" UNIQUE (user_id);
ALTER TABLE public."timetables" ADD CONSTRAINT "timetables_pkey" PRIMARY KEY (id);
ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE public."academic_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."academic_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cbc_report_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."classrooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_planning_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guardians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_test_payment_reset_backup_20261108" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."learning_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."streams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."summative_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bulk_billing_batches" ADD CONSTRAINT "bulk_billing_batches_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE public."document_signing_batch_items" ADD CONSTRAINT "document_signing_batch_items_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES document_signing_batches(id) ON DELETE CASCADE;
ALTER TABLE public."goods_received_notes" ADD CONSTRAINT "goods_received_notes_item_id_fkey" FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public."goods_received_notes" ADD CONSTRAINT "goods_received_notes_purchase_request_id_fkey" FOREIGN KEY (purchase_request_id) REFERENCES inventory_purchase_requests(id) ON DELETE RESTRICT;
ALTER TABLE public."inventory_purchase_requests" ADD CONSTRAINT "inventory_purchase_requests_item_id_fkey" FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public."inventory_stock_movements" ADD CONSTRAINT "inventory_stock_movements_item_id_fkey" FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public."inventory_supplier_invoices" ADD CONSTRAINT "inventory_supplier_invoices_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;
ALTER TABLE public."inventory_supplier_invoices" ADD CONSTRAINT "inventory_supplier_invoices_purchase_request_id_fkey" FOREIGN KEY (purchase_request_id) REFERENCES inventory_purchase_requests(id) ON DELETE SET NULL;
ALTER TABLE public."learning_areas" ADD CONSTRAINT "fk_learning_areas_global_subject" FOREIGN KEY (global_subject_id) REFERENCES global_subjects(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public."parent_consent_requests" ADD CONSTRAINT "parent_consent_requests_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE public."parent_consent_responses" ADD CONSTRAINT "parent_consent_responses_consent_request_id_fkey" FOREIGN KEY (consent_request_id) REFERENCES parent_consent_requests(id) ON DELETE CASCADE;
ALTER TABLE public."parent_consent_responses" ADD CONSTRAINT "parent_consent_responses_parent_user_id_fkey" FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."parent_consent_responses" ADD CONSTRAINT "parent_consent_responses_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE public."parent_consent_responses" ADD CONSTRAINT "parent_consent_responses_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "student_parent_links_guardian_id_fkey" FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE SET NULL;
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "student_parent_links_parent_user_id_fkey" FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "student_parent_links_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE public."student_parent_links" ADD CONSTRAINT "student_parent_links_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
