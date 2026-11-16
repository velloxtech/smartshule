# Authorized production schema additions — 16 November 2026

Applied to the configured online Supabase production database following the user's explicit instruction to add missing schema without deleting anything. Source checkout: `b18836c643e8cb1cee0e42b65b9f1a0f7def16d2` plus the additive migration and audit artifacts. No application deployment or Git push was performed.

Migration: `database/migrations/20261116_add_missing_payroll_complaint_and_reversal_schema.sql`.

Committed at **2026-11-16 06:12:41 UTC / 09:12:41 Africa/Nairobi**:

- Seven nullable payroll acknowledgement fields; historical salaries were not marked acknowledged.
- Thirty-eight complaint fields and three search/workflow indexes.
- Private 33-column `transaction_reversal_requests` table, three explicit indexes (including active-request uniqueness), primary/reference uniqueness, amount/status/audit checks and RLS. Browser-role grants revoked on this newly created table; existing backend owner access retained.

`application-result.json` contains the migration SHA-256 and aggregate preservation checks. The transaction took short exclusive locks on the two affected existing tables, compared original column metadata and row-value digests before/after, and committed only after all checks passed. Nine payroll rows and all their original values were identical; complaints remained empty; no original public table disappeared. SQL contains no business INSERT/UPDATE/DELETE, DROP or TRUNCATE. It creates no payments, salaries, acknowledgements, complaints or reversal requests. No historical backup table was altered or removed. Brief database locks were used; no downtime measurement was taken.

`post-verification.json` records an independent read-only connection at 06:13:18–06:13:23 UTC. It confirmed 45 payroll columns, 57 complaint columns and 33 reversal columns, six explicit indexes, nine unchanged/unacknowledged payroll rows, empty complaints/reversals, and browser denial on the new table. PostgreSQL PREPARE successfully parsed the actual INSERT/upsert statements extracted from all three backend adapters; none was EXECUTEd on production. This proves schema compatibility for those statements, not every business workflow.

The exact consolidated migration was rehearsed twice in the isolated PostgreSQL schema/adapter suite before application: **19/19 tests passed**, including current-workflow observation tests. Its report is `/tmp/smartshule-review-20261116/production-migration-rehearsal.json`; the disposable cluster was stopped afterward. This was a synthetic metadata-based schema fixture, not a production data restore. No hosted-backup restore rehearsal or backup availability certification was performed. Transactional DDL and preservation checks were used for this bounded additive repair.

## Remaining work

This is a targeted F02/F03 schema repair, not certification that production is fully clean. The 58 pre-existing RLS-disabled browser-readable tables (F01), exposed backups (F13), salary account linking (F10), operational term/assignment decisions (F04/F07) and application approval/coverage defects (F11) remain. These require their reviewed permissions, data mapping or code changes; adding columns does not fix them. Existing table grants and defaults were not broadened or otherwise changed. In particular, sensitive fields on existing tables retain those tables' existing access model, so permission containment remains urgent.

No unused salary-link bridge was deployed: the current application does not consume it and HR mappings are not approved. No duties, terms or timetables were guessed or changed. No payroll was regenerated. No existing schema fields were renamed or converted. No additional deployment or automatic full migration batch was run.

## Operational notes

`preflight.cjs` is read-only and stores current metadata in `/tmp/smartshule-review-20261116/production-schema-preflight.json`. `apply.cjs` requires an explicit flag, a matching target fingerprint and a recent, reviewed preflight; its guard intentionally refuses the already-present reversal table. **Do not rerun it as a general migration tool.** `verify.cjs` is read-only; its schema-compatibility PREPARE statements do not execute business DML. No connection strings or row contents appear in recorded evidence.

For application rollback, retain additive schema and any future business evidence. Do not drop new columns/table or restore old data over concurrent user changes. A future new-table RLS policy for a different backend identity must be separately reviewed; the observed production backend identity is the owner `postgres` with BYPASSRLS.
