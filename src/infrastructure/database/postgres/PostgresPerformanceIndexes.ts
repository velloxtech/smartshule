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
    const existing = await pool.query<{valid: boolean}>(
      'SELECT i.indisvalid AS valid FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',
      ['public', name]
    );
    if (existing.rows[0]?.valid) continue;
    // A cancelled concurrent build can leave an unusable index with the same name.
    if (existing.rows.length) await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${name}`);
    await pool.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON public.${table} (${columns})`);
  }
}

export function startPerformanceIndexMaintenance(pool: Pool): void {
  // Indexes improve performance but are not required to serve correct responses.
  // Long transactions can delay concurrent builds; never hold health readiness on them.
  void ensurePerformanceIndexes(pool).then(() => {
    console.log('[PostgreSQL] Performance indexes verified.');
  }).catch((error: any) => {
    console.warn('[PostgreSQL] Optional performance index maintenance deferred:', error?.code || error?.message || 'database unavailable');
  });
}
