# Production term consolidation — 16 November 2026

User authorization: “Can you move them to one and delete the duplicate?” Scope: consolidate duplicate terms while preserving linked business data, assignments and historical evidence. Application baseline: `e06bd59f745e98dfb87cbfdb54eb44ceef49fda0`; existing unrelated local work was retained.

## Reviewed mapping

| Removed duplicate | Retained canonical term | Academic year / number |
| --- | --- | --- |
| `term-2026-t1` | `term-2026-1` | 2026 / 1 |
| `term-2026-t2` | `term-2026-2` | 2026 / 2 |
| `term-2026-t3` | `term-2026-3` | 2026 / 3 |

The normalized IDs already serve the vast majority of operational records and calendar keys. Existing dates, names and current flags on these canonical rows are retained exactly. The genuine 2027 Term 1 is separate and is not a duplicate.

Read-only discovery inspected all scalar text, JSON and array columns across **72 public tables**, not just declared foreign keys. It found **two schemes and two invoices** needing their term references changed. Most other records already use canonical IDs. Audit logs, deleted-student snapshots and historical backup tables contain historical identifiers; those immutable snapshots are preserved, not rewritten as current records.

## Safety and implementation

Migration: [`20261116_consolidate_duplicate_2026_terms.sql`](../database/migrations/20261116_consolidate_duplicate_2026_terms.sql). Guarded runner: [`consolidate-production-terms.cjs`](../scripts/investigation/consolidate-production-terms.cjs).

- A private custom-format backup of the complete public schema/data was created before mutation and successfully restored to an isolated localhost database. It contains sensitive data and is excluded from version control.
- The runner pins production to the reviewed connection fingerprint, requires the exact migration and backup to have passed local testing, and compares term settings against the reviewed preflight. Changed settings cause an abort.
- One explicit transaction locks public tables against concurrent writes, moves exact scalar term references, checks every live table for unresolved legacy references, and only then commits deletion of the three duplicate rows. Unexpected JSON/key references abort instead of being blindly rewritten.
- The original duplicate rows and canonical settings are retained in `smartshule_maintenance.term_consolidation_history`. The private schema/table deny `PUBLIC`, `anon` and `authenticated` access; RLS is enabled. No public backup table is created.
- A unique index, `uq_academic_terms_year_number`, prevents another row with the same academic year and term number. Existing application duplicate-conflict handling already recognizes this name.
- Before commit, normalized full-row fingerprints and counts for all 72 public tables must match the expected result. Only term-reference substitutions and the three duplicate term removals are allowed. Thus scheme contents, invoice amounts, payments, assignments, dates and current flags must remain unchanged. Real writes after the transaction releases its locks are not blocked indefinitely.

## Local verification

Private backup SHA-256: `a4fb6516ac8159e5c08a0ad9bdcae3c8cb390baf41bb588a3af8b197ecdb6b5c` (530,803 bytes). Migration SHA-256: `3feeccb857273891fa52e9775b680f2ffeedecd8fd2a2c5a7f6759246c96cc87`.

Disposable target: `127.0.0.1:55471/smartshule_term_merge_20261116`, explicitly guarded by the cluster data directory. The initial restore reported only an existing `public` schema; a clean restore was then run and completed without warnings/errors.

Command: `node scripts/investigation/consolidate-production-terms.cjs --local-test`.

Passed checks:

1. Exact production backup restore and consolidation: seven terms become four; two scheme references and two invoice references move.
2. All 72 table fingerprints match the expected transformation; business rows and values are preserved.
3. A rollback restores the complete original public data.
4. A second execution is idempotent.
5. An injected unexpected live JSON reference causes the migration to abort and roll back.
6. Duplicate term insertion is rejected with PostgreSQL `23505`.
7. Browser roles cannot access the private consolidation history.

`node --check` and `git diff --check` passed. No application bootstrap, seeds, payroll regeneration, payment operations or messaging were used.

## Remaining operational decisions

This repair deliberately does **not** choose the operational year/term or rewrite school dates. In the reviewed snapshot, canonical `term-2026-2` has dates **3 May–30 July 2027**, despite belonging to 2026. Its removed counterpart has 2026 dates. This discrepancy must be corrected through the existing academic settings after the school confirms the real dates. Canonical 2026 Term 3 retains **24 August–31 December 2026**. The alternative dates remain available in private consolidation history.

Review the operational-year/current-term settings separately. This consolidation is not a rollover and does not activate 2027. Refresh browser sessions after cleanup so they discard a previously selected duplicate term ID. Historical backup/deletion/audit snapshots intentionally still contain their original IDs, with the private mapping available for any future restoration.

## Production result

The authorized transaction **committed successfully on 16 November 2026 at approximately 20:17:53 UTC**. Independent read-only verification on a new connection completed at 20:18:29 UTC.

- Three duplicate term rows removed; four genuine terms remain: 2026 Terms 1–3 and the existing 2027 Term 1.
- Two schemes and two invoices relinked. All **6 schemes**, **163 invoices**, **1,930 summative assessments** and **4 payments** remain, with content/amount preservation checked in the transaction.
- **10 class duties and 44 subject duties** remain byte-for-byte equivalent in the row-fingerprint comparison. No assignment year, teacher, class, stream, subject or effective date was changed.
- Zero remaining duplicate `(academic_year_id, term_number)` groups. Zero removed-ID references in live tables at commit; the fresh connection also confirms zero in schemes/invoices.
- Duplicate-prevention unique index is present. Three private history mappings exist. `anon` and `authenticated` have neither schema usage nor table select permission on the maintenance archive.
- All 72 public tables passed expected full-row preservation checks. The operational current flags and canonical dates are unchanged.

The independent check additionally found **two academic-year rows both named 2027**, one current and one not current. The existing 2027 term belongs to the *non-current* 2027 year; 2026 is currently marked inactive. These are separate year/activation inconsistencies, not duplicate term rows within one year. They were preserved rather than silently merging academic years or choosing the active period. The earlier 2026-current audit snapshot no longer describes these flags. School review is required before any separate year consolidation or period correction.

Sanitized receipt: [`term-consolidation-20261116.json`](term-consolidation-20261116.json). Private backup, preflight, locked before-images and detailed verification are retained under the git-ignored `backups/term-consolidation-20261116/` directory with restrictive permissions. No push or app deployment is necessary for this completed database repair; the migration remains in the repository for audit and repeatable setup. Existing uncommitted web/backend/mobile work was not published by this task.
