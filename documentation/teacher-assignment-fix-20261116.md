# Teacher class and subject assignments disappearing — 16 November 2026

Source baseline: `b18836c643e8cb1cee0e42b65b9f1a0f7def16d2`. This repair changes the backend and tests only. Existing mobile edits and production schema/audit work are separate and preserved.

## Confirmed causes

1. **Wrong-year term lookup.** Production has 2026 marked as the current year, no 2026 term flagged current, and a 2027 term flagged current. The PostgreSQL adapter ignored the requested year when finding a current term. The shared teacher access policy rejected that cross-year result. A read-only probe reproduced the error for all seven checked teacher accounts. Their assignments were not deleted: the current snapshot contains 42 saved subject duties.
2. **Profile cache mistaken for saved class duty.** Teacher onboarding saved `assignedClassStreamIds` but did not itself persist the canonical class duty. A browser follow-up was responsible for it and ignored failures. A profile could therefore display an assignment that the permission policy could not find at the next login. Administrative profile editing had the same discrepancy when explicitly selecting a class stream.
3. **Repeated portal lookups.** Authorized context reloaded periods/profiles/assignments inside class/stream/subject loops. This added many database round trips and could mix results if assignments changed during loading.

## Changes

- `PostgresAcademicRepository.findCurrentTerm(yearId)` now scopes results to that year. An explicitly flagged term wins. If that year has no flagged term, its latest started term is a deterministic read-only fallback; no term/year flag is changed. It never falls back to another year's term or an unstarted, unflagged future term.
- Teacher access recognizes that resolved operational period even when its stored current flag is absent, using today's assignment date rather than a past closing date. Explicit historical periods still use their bounds; future-start duties are not prematurely authorized.
- Authorized context derives class/subject choices and editable areas from one request-local assignment snapshot, sharing cohort matching with server authorization. Class-teacher read access remains distinct from explicit subject-teaching/edit permissions.
- Both onboarding paths save the formal class duty server-side, and require a configured school academic year before creating a staff account with a selected class. An explicit stream selection during administrative editing also uses that canonical assignment path. No browser follow-up is necessary for onboarding success.
- No new production migration is needed for this fix. No existing assignments, monetary records, backups or mobile files were altered.

## Verification

- Isolated PostgreSQL regression: **4 tests passed** using the exact local review database and server-data-directory guard. A self-contained 11-table schema fixture contains synthetic data only. It reproduces the cross-year flags, saves class and subject duties, closes the database connection pool, reopens it, creates a new teacher portal session and checks the actual authorized-context HTTP route. It also rejects another subject in a subject-only stream and denies class-teacher privileges there; future and historical effective-date restrictions remain intact. The private fixture schema is removed after the test.
- Related assignment/access/syllabus regressions: **67 tests passed**, including the initial four PostgreSQL tests.
- Onboarding/profile regressions: **44 tests passed**, including initial password login and authorized-context retrieval with no browser assignment follow-up, plus canonical duty assertions after admin editing.
- Backend TypeScript build: **passed**, emitted to `/tmp/smartshule-review-20261116/assignment-fixed-dist`.
- Full default suite: **99 suites / 1,180 tests passed**, 202.392 seconds. No production credentials were passed to it. `git diff --check` also passed.
- Corrected application code against production: explicit **read-only transactions**, rollback, no app initializer or production login impersonation. Assignment access no longer fails for any of the seven accounts. The full authorized-context use case returns classes and learning areas for six accounts; one has no active formal duty. Per-account use-case times were approximately 4.7–6.3 seconds from this environment; these are direct database checks, not deployed HTTP latency measurements.

Evidence stays under `/tmp/smartshule-review-20261116/`: `assignment-preflight.json`, `assignment-codefix-readonly.json`, `assignment-portal-readonly.json`, `assignment-postgres-final.log`, `assignment-regression.log`, `onboarding-regression.log`, `assignment-build.log`, and the full-suite log/JSON. Raw account identifiers are not copied into this report.

## Release and school decisions

The code must be released before the hosted portal uses it. A healthy existing `/health` response does not establish the deployed revision. No deployment is claimed by the read-only code checks.

The school still needs to confirm whether its operational period is **2026 Term 3 or 2027 Term 1** before production year/term flags are changed. This question is pending; no period flags were guessed or changed. Some saved subject duties begin in the future and will remain unavailable until their effective dates; the school should confirm those dates. An account with no canonical duty must be explicitly assigned by an administrator. No cached or inferred value is promoted to permission automatically.

Acceptance after release: assign a teacher, sign out, sign in using the teacher account, confirm class/stream and subject choices, enter marks only for authorized scopes, and repeat with a class teacher who teaches one subject in another stream. Historical assignments must remain in history. An incomplete year/term rollover must not hide otherwise valid saved duties.
