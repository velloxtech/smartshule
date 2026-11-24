import type { Pool } from 'pg';

/** Based on production pg_stat_statements and existing indexes. No record changes. */
export const PERFORMANCE_INDEXES = [
  ['idx_users_email_lower', 'users', 'LOWER(email)'],
  ['idx_users_phone_subscriber', 'users', "RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 9)"],
  ['idx_report_cards_term_stream', 'cbc_report_cards', 'term_id, stream_id'],
  ['idx_lesson_plans_teacher_date', 'lesson_plans', 'teacher_id, lesson_date'],
  ['idx_lesson_plans_class_date', 'lesson_plans', 'classroom_id, lesson_date'],
  ['idx_lesson_plans_scheme_entry', 'lesson_plans', 'scheme_of_work_entry_id'],
  ['idx_schemes_class_term', 'schemes_of_work', 'classroom_id, term_id'],
  ['idx_schemes_teacher_term', 'schemes_of_work', 'teacher_id, term_id'],
  ['idx_payments_school_date', 'payments', 'school_id, payment_date DESC'],
] as const;

export async function ensurePerformanceIndexes(pool: Pool): Promise<void> {
  // Outside a transaction; concurrent builds keep existing traffic able to read and write.
  for (const [name, table, columns] of PERFORMANCE_INDEXES) {
    await pool.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON public.${table} (${columns})`);
  }
}
