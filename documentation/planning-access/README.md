# Teacher assignment access and calendar planning — local review

Status: implemented locally; Render and Supabase have not been changed. Production migrations have not been applied. Local PostgreSQL fixtures run inside a transaction and roll back. The browser preview used an uncommitted transaction and blocked external browser requests. It has been closed; a read-only check confirmed zero fixture users and zero fixture planning configurations remain.

## Causes and changes

The PostgreSQL lesson-plan list ignored repository filters, and curriculum actions lacked a shared assignment check. Owning a Grade 3 record therefore did not stop a Grade 2 teacher from opening it. Client selectors and legacy teacher profile assignments were insufficient authorization. A shared backend policy now checks school, academic year, term, active assignment dates, class, stream, learning area and private-work ownership. Subject assignments allow cohort learner access without granting another learning area's private planning. Existing administrator/headteacher/deputy roles provide supervisory access; ordinary teachers cannot request it through a filter.

The HTTP guard checks stored records before mutations, including guessed IDs and encoded IDs, and filters returned lists and academic selectors. Coverage, work-record, health, discipline, occurrence, attendance-trend, library-loan and CBC summaries filter records before aggregation. School executive analytics remain restricted to leadership. Parent handling continues through the existing parent authorization.

Curriculum plans have use-case authorization as well as the transport guard. Old tracker paths remain available, and `/syllabus-coverage` is an alias. User-facing labels now say **Syllabus Coverage Plan**. The new workflow reuses academic assignments, timetables, schemes, lesson plans and records of work.

Administrators publish a term calendar with teaching weekdays and dated holiday/closure/activity exceptions. Exceptions can select classes, streams, periods or time ranges. The timetable determines the actual subject periods, including multiple periods per day. Missing configuration gives an actionable setup message. Configuration updates use revision checks to reject stale writes.

Whole-term schemes may remain partial drafts. Completion requires exactly the eligible slots with valid content, without duplicates or slots outside the calendar. Weekly lesson numbering starts again each week; the opening partial week retains its calendar week number. Sequencing is configured per class/stream/term; completion and submission of the previous area's validated scheme unlocks the next area. Rejection or a calendar change that invalidates completion locks it again.

Scheme entries retain date/time snapshots. Calendar/timetable changes recalculate eligibility and flag cancelled dates, changed periods and changed lesson numbering. Cancelled entries can be archived while retaining their content and links. Archived entries do not count toward current completion. Rescheduling a lesson makes a draft copy, retaining the original lesson and any completed teaching records. A linked teaching record is created as a draft for review through the existing work-record workflow.

Two additional defects found during verification were fixed: term aliases now normalize only a terminal `-t1`/`-t2`/`-t3`, and PostgreSQL DATE fields in records of work no longer shift backwards through UTC when read and saved in Nairobi.

## Changed modules

- `src/application/shared/TeacherAssignmentAccess.ts`: shared assignment and ownership policy.
- `src/application/planning/`: calendar configuration, timetable slot derivation, sequencing, validation and revision persistence.
- `src/application/curriculum-plans/`: protected schemes/lessons, calendar-linked entries, archive/rescheduling and teaching links.
- `src/infrastructure/http/middlewares/teacherAssignmentGuard.ts`, planning/controller routes and summary controllers: request enforcement and scoped output/aggregates.
- PostgreSQL repositories/container/database factory: real configuration persistence, scheme filters, teaching links and date handling.
- `Frontend/smartshule/src/components/views/SyllabusCoveragePlanView.tsx`: workflow, calendar and sequence configuration, weekly planning, conflict resolution and linked teaching records.
- Existing scheme/lesson modal, tracker labels, academic selectors, marks dialog, broadsheet defaults, competency analytics and API helpers: integration with authorized planning and selected periods.

## Verification

The six targeted suites passed 44 tests: `calendar_assignment_planning_local`, `curriculum_tracker_api`, `teacher_scoping_and_idor`, `curriculum_progression_gating`, `timetable_persistence`, and `assessment_investigation_local`. The tracker suite now seeds a real assignment for its Grade 3 fixture instead of assuming a teacher can plan an arbitrary class.

The PostgreSQL planning suite tests Grade 2 class-only and Maths/stream-A-only teachers plus an administrator; Grade 3 direct IDs, print/export aliases, private ownership, other learning areas/streams, searches, mutation denial, linked clinic/discipline records, scoped summaries, deactivated assignments, published-calendar prerequisites and missing timetables. It checks the 47-slot term, 46-entry draft, 46/48 completion failures, duplicate/outside slots, sequencing and calendar-change preservation. Week 1 starts Wednesday 5 November 2025 with that day closed: only Thursday 6 and Friday 7 remain. Week 2 has Monday–Friday Lessons 1–5. Multiple periods, class-only exceptions and half-day cancellations are also covered.

Builds: backend TypeScript, frontend TypeScript and Vite passed. The full browser sweep passed 162 route/viewport checks with no JavaScript errors, failed API responses or document overflow at 390, 768 and 1440 pixels. It covered 26 teacher tabs for both the Grade 2 class teacher and the Maths/stream-A teacher, plus the administrator coverage and work-record screens. These are render/API/responsiveness checks; the planning workflow additionally saves content through real forms. Browser results are recorded separately in `browser-checks.json`; that file lists the exact routes, fixture roles and widths checked. The additional phone workflow passed lesson creation from a schemed slot, a real one-page A4 PDF download (16,200 bytes, text and layout checked), and creation of a linked teaching draft. The administrator UI successfully republished the calendar and saved the sequence. `workflow-checks.json` records 10 checks and `admin-workflow-checks.json` records 3 checks, with no errors or overflow. Local scripts are `scripts/planning-local-preview.ts` and `scripts/planning-browser-audit.cjs`.

## Migration review and rollback

Review `database/migrations/20261113_calendar_curriculum_planning.sql`. It adds a school-scoped, revisioned JSON configuration table and `records_of_work.planning_link`. Entry slot/archive metadata uses the existing scheme JSON column. Lesson metadata requires the separately prepared `20261112_lesson_plan_document_metadata.sql` migration. No historical rows are rewritten, guessed, restored or deleted.

Run the accompanying `preflight.sql` using a read-only production connection before any deployment. Review missing ownership, missing assignments, unlinked historical entries and existing columns. Verify the Render backend database role can access the new table; Supabase anonymous/authenticated client roles are explicitly denied. No production data repair is proposed without verified ownership/source data.

Before an approved migration, take a schema/data backup of `curriculum_planning_config` (if present), `records_of_work`, `schemes_of_work` and `lesson_plans`. Apply the reviewed additive migration before deploying the new application. Check the table and column, then configure assignments, timetable and a school-approved published calendar; no calendar is automatically published from guessed dates.

Rollback steps: restore the previous application release first and retain the additive columns/table, preserving all new planning data. If schema removal is specifically approved, export configuration rows and linked planning data, confirm no application version still uses them, then run the reviewed rollback SQL. Do not remove JSON entry/lesson metadata or teaching links merely to roll back the UI.

## School decisions and operational limits

The school must choose approved calendar dates/exceptions, teaching weekdays, sequence order and whether sequencing is enabled. It should confirm that existing administrator/headteacher/deputy supervisory roles are the intended supervisors. No additional peer-teacher sharing permission is inferred.

Legacy unlinked planning entries, lesson plans without a verified source period, and records with absent/unverified teacher ownership are retained for administrator review; teacher access is not inferred from names or grade labels. Administrators must verify ownership and map old scheme entries to eligible slots before those entries can satisfy calendar completion. Historical learner access uses the existing learner's class/stream fields; a separate dated enrolment-history model would require a school decision if transferred learners must remain visible to former teachers.

The calendar does not fetch public holidays automatically: administrators publish the school's verified exceptions. A changed timetable/calendar can require teachers to archive cancelled entries or reschedule retained work before the scheme validates again. Existing approved taught records are retained.
