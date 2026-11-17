# Production audit review — 16 November 2026

These remain review proposal sources. **Update:** F02/F03 were subsequently authorized and applied through the consolidated `20261116_add_missing_payroll_complaint_and_reversal_schema.sql` migration; see `documentation/production-schema-20261116/README.md`. The other proposals remain unapplied. They deliberately live outside `database/migrations`. See the dated addendum in `SMARTSHULE_CODEBASE_AUDIT.md` for evidence and acceptance criteria. No application implementation was changed.

## Proposed sequence

1. Confirm Supabase Data API enabled state/exposed schemas and all external consumers. Repository clients use the backend API; no dependency on browser database roles was verified. Capture existing relation, sequence, function, schema and default ACLs and role memberships. Inventory owners and separately granted column privileges, security-definer routines, views and extensions. Review managed-object ownership before executing SQL as a privileged account.
2. Review `proposals/001_private_browser_permissions.sql`. It removes existing public-schema browser/PUBLIC grants and creator-specific future grants. Global default revocation is necessary because a schema-local revoke cannot remove a global default, and affects future objects in other schemas for those creators. This wider effect needs Supabase owner approval. Existing explicit backend/service grants are retained. It does not provision a new backend identity or claim least privilege for the current one. An unexpected owner or retained effective table permission causes rollback. Review additional creators if discovered. Schema USAGE is retained; USAGE alone does not grant table access. Post-change review must inspect column grants and callable security-definer entry points too.
3. Review `002_payroll_and_complaints.sql` and `003_reversal_requests.sql` against a fresh schema snapshot. These add missing columns/tables without updating historical records. Explicitly grant the actual backend identity access to newly created private tables; retain browser denial. Validate existing column types, lengths and defaults first: `ADD IF NOT EXISTS` does not repair incompatible existing definitions. Reversal transaction polymorphism requires relationship validation in code, and duplicate-active constraint errors need a controlled conflict response.
4. Review `004_reviewed_salary_identity_bridge.sql` and SELECT-only `005_salary_candidate_review.sql` with HR. Candidate matching is evidence for a review, never an automatic authorization/backfill. The bridge is a proposal for preserving original payroll references and payments. It is ineffective until backend salary list, detail, acknowledgement, dispute and signing operations all resolve the same reviewed link with school checks. New payroll generation must use canonical teacher IDs and detect existing months via reviewed legacy links. Never regenerate payroll to fix visibility.
5. Review code changes for term-scoped lookup, curriculum publication, lesson-plan approval removal and record/coverage approval bypasses separately. Confirm school term aliases, subject duties, calendars and timetable before activating planning. Do not run historical seed migrations as a shortcut: the 8 November consent migration includes seeded requests; the 14 November class-duty migration deactivates conflicting assignments.

Production implementation requires owner approval, exact before/after schema/ACL capture, an isolated restore rehearsal, backend and browser-role acceptance checks, and a reviewed deployment/migration order. Rollback restores captured ACLs, not blanket `GRANT ALL`. Additive schema rollback should leave new columns/tables intact while reverting application consumers; do not drop new business data. No production change is authorized by this review.

## Reproduction and limitations

`tests/observed_schema.sql` reconstructs the 15 November audit's public schema metadata (71 tables and captured constraints/RLS flags). It contains no production rows. Observed `information_schema.data_type` did not retain varchar bounds: this fixture tests adapter contracts, constraints and ACL mechanics, not byte-for-byte schema equivalence. Seeds are synthetic. PostgreSQL 17 is used locally; Supabase gateway behavior, extensions, managed ownership and real deployment identity remain separate acceptance checks.

The integration tests intentionally require the exact disposable URL below **and** verify the server's `data_directory` before dropping the disposable public schema. Never relax this guard to use production/staging. They establish their own browser/backend roles, reproduce unsafe grants, and apply proposals twice. The backend role has BYPASSRLS to model the existing privileged-backend architecture, not to recommend that permission for a new role.

```sh
# Cluster initialized for this review only; restart it if needed:
/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/smartshule-review-20261116/pgdata -l /tmp/smartshule-review-20261116/postgres.log -o "-p 55471 -h 127.0.0.1 -k /tmp/smartshule-review-20261116/socket" -w start

env -i PATH="$PATH" SMARTSHULE_REVIEW_DATABASE_URL=postgresql://postgres@127.0.0.1:55471/smartshule_audit_review_20261116 ./node_modules/.bin/jest --config documentation/audit-review-20261116/tests/jest.config.cjs --runInBand

env -i PATH="$PATH" npm test -- --runTestsByPath tests/integration/syllabus_weekly_scheme_workflow.test.ts

/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/smartshule-review-20261116/pgdata -w stop
```

`workflow_observations.test.ts` deliberately asserts several **current defective behaviors**. Passing these probes reproduces the findings; it does not mean that those behaviors satisfy the requested workflow. Convert them to rejection/approval-independent acceptance assertions when fixes are authorized. The existing workflow suite also contains approval assumptions that will need revision when lesson-plan approval is removed. No browser UI automation or real external messaging/payment operation was run.
