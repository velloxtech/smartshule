# Curriculum & Timetable: implementation and familiarisation readiness

Reviewed 16 November 2026. Baseline checkout: `e06bd59f745e98dfb87cbfdb54eb44ceef49fda0` on `main`. The changes described below are local, uncommitted implementation changes; they have not been deployed. No production data or settings were changed for this work. Mobile and desktop packaging were excluded and existing native edits were preserved.

## What changed

The admin Curriculum & Timetable menu now starts with **School Calendar Plan**, using the existing calendar setup logic and a calendar icon. The page shows the selected year and term, dates, teaching weekdays, holidays, closures, activities, additional teaching dates and exclusions. Publishing exposes **Set Up Timetable**. A disagreement between the operational year and its current-term flags displays the selections and opens the existing academic settings modal. Selecting a future planning year does not activate it.

Teachers see their class, stream, learning area and period, followed by this order:

**School Calendar → Timetable → Syllabus Coverage Plan → Scheme of Work → Lesson Plan → Record of Work**

Calendar and timetable readiness are information for teachers, with administrator responsibility stated when setup is incomplete. The primary action follows actual progress: create coverage, continue a draft, review comments, wait for review, create an optional lesson plan or record work. Missing subject assignments and missing periods have specific explanations. For Grades 1–3, an active class-teacher duty grants teaching and planning for every learning area in that cohort. Other grades still require subject duties for planning.

The existing optional prerequisite found in coverage was a **same-term learning-area sequence**, rather than proof of a previous school term. Its wording is now explicit. Separate continuity checks now cover previous school terms:

| Situation | Behaviour |
| --- | --- |
| School has no earlier approved scheme history | Admin/head/deputy records **Start First Term in SmartShule**, with a reason. This can be Term 1, 2 or 3. Teachers then plan from published curriculum. |
| Previous period has approved schemes for this class/stream/area | Teachers review approved unfinished entries and select what to carry into the current draft. Source references are retained; previous schemes are not changed. Already carried entries are not duplicated. |
| Later period lacks the required previous approved scheme | Show the missing period/context. Administrator can restore and approve genuine records or record a reasoned, scoped missing-prior resolution. No placeholder schemes are generated. |
| Future term is being prepared while its predecessor is still running | Preparation is allowed where continuity history exists. Explain that unfinished work must be reviewed again before teaching starts. The operational year is unchanged. |

First-use and exception decisions are stored in the existing revisioned planning configuration repository, scoped to school and period; exceptions also include class/stream/area. First-use cannot overwrite an earlier recorded start or bypass existing earlier approved school history. Calendar publication through the new/shared UI enables `guidedWorkflow`; legacy calendars without that flag retain compatibility until an administrator republishes them. This rollout distinction is intentional.

## Approval and progress rules

Teacher-proposed strands and sub-strands enter a private review queue. Admin/head/deputy publish validated entries or return them with comments. Pending proposals are not inserted into the published curriculum and cannot become phantom parent entries in another form. Published curriculum deletion is restricted to leadership. Concurrent review uses revision checks and stale-target detection.

Coverage plans, schemes and records of work retain server-side approval. A partially approved scheme exposes only approved entries to lesson preparation and work recording. Returned scheme comments and reviewer metadata now survive PostgreSQL reloads.

Teachers save and use lesson plans immediately; no lesson-plan approval is required. Lesson outcomes must remain within the approved scheme entry, so editing a lesson cannot expand approved curriculum. A work record can come directly from an approved scheduled scheme entry without a detailed lesson plan. The form captures the actual date, work done, outcomes, teaching status, remaining work and reflection. Partial, postponed and cancelled records retain their history. Future actual work cannot be submitted.

Submitted records count as **reported** progress. Only official approved records contribute to **confirmed** coverage; a partial record does not mark an entire scheduled lesson complete. Distinct confirmed outcomes are deduplicated within the selected class/stream/area/period scope. One linked lesson no longer confirms an entire legacy week. Earlier pending records do not block recording the next eligible scheduled lesson. Duplicate active submissions for one source entry are rejected.

## Main implementation evidence

| Area | Current files |
| --- | --- |
| Sidebar and route | `Frontend/smartshule/src/utils/rbac.ts:492`; `Frontend/smartshule/src/App.tsx` |
| Shared calendar form and settings link | `Frontend/smartshule/src/components/curriculum/SchoolCalendarEditor.tsx`; `Frontend/smartshule/src/components/views/SchoolCalendarPlanView.tsx` |
| Teacher next action and period handoff | `Frontend/smartshule/src/components/curriculum/PlanningRoadmap.tsx`; `Frontend/smartshule/src/utils/planningPeriod.ts`; `Frontend/smartshule/src/components/views/WebSyllabusCoveragePlanView.tsx` |
| First-use, missing-prior, carry and readiness | `src/application/planning/PlanningWorkflowService.ts:9` (continuity), `:29` (decisions), `:39` (carry), `:56` (readiness) |
| Curriculum publication gate | `src/application/planning/CurriculumProposalService.ts`; `src/application/cbc/CbcAssessmentUseCases.ts`; `Frontend/smartshule/src/components/curriculum/CurriculumProposalReview.tsx` |
| API and setup diagnostics | `src/infrastructure/http/routes/index.ts:498`; `src/infrastructure/http/controllers/CalendarPlanningController.ts:46` |
| Direct work records and source authorization | `src/infrastructure/http/controllers/CalendarPlanningController.ts:55`; `src/infrastructure/http/middlewares/teacherAssignmentGuard.ts`; `src/application/curriculum-plans/RecordOfWorkUseCases.ts` |
| Official coverage and distinct outcomes | `src/application/planning/TermAllocationService.ts:264`; `src/application/curriculum-tracker/CurriculumTrackerUseCases.ts` |
| Exact year/term timetable isolation | `src/application/timetables/TimetableUseCases.ts`; `Frontend/smartshule/src/components/views/TimetableView.tsx` |
| Persisted review metadata | Scheme adapter in `src/infrastructure/database/postgres/PostgresRepositories.ts` |

## Director's setup before teachers begin

1. **Release this reviewed backend and web implementation together.** It is currently local. No new schema migration is required for this feature: governance uses existing configuration JSON documents and existing review columns. This does not replace unrelated production database remediation recorded in the main audit.
2. **Confirm the operational period in Academic Year & Term Settings.** For current 2026 work, select the real 2026 operational year and correct term, with the school's actual dates. Keep 2027 preparation separate by selecting 2027 in planning; do not activate 2027 to make its forms appear. Review existing aliases and historical periods without deleting records.
3. **Verify each teacher account and assignment.** The login must link to the correct staff profile. Save the class-teacher duty where relevant. Grades 1–3 class teachers teach all learning areas in their assigned cohort; for other grades or subject-only teaching outside that cohort, save separate subject duties. Check academic year, class, stream and effective dates. A 2027 assignment does not replace the teacher's 2026 duty. Test a subject-only teacher as well as a class teacher.
4. **Review the published curriculum for each grade and learning area.** Approve valid teacher proposals; return incomplete entries with comments. Teachers need actual published strands, sub-strands and learning outcomes.
5. **Confirm the school's first SmartShule period.** On School Calendar Plan, use Start First Term in SmartShule only for the genuine first period and record the reason. It need not be Term 1. Where earlier approved history exists, review unfinished work instead. Resolve later missing prior records explicitly for the affected teaching context.
6. **Publish the actual School Calendar Plan.** Confirm term dates, teaching weekdays, holidays, closures, school activities, class exclusions, additional teaching dates and closing date. Republish an older calendar through this UI to enable the guided workflow.
7. **Set up the matching timetable.** Use Set Up Timetable and verify the selected year/term and each class/stream. Include the assigned learning-area periods and sufficient usable lesson slots. A class-wide timetable may be inherited by a stream; another stream or year's timetable must not be mistaken for it.
8. **Choose whether the optional same-term learning-area sequence is needed.** Leave it disabled during familiarisation unless the school deliberately requires that policy. It is separate from previous-term continuity.
9. **Run a real staff acceptance example after release:** assigned teacher → coverage draft → leadership approval → complete at least one sub-strand scheme entry → leadership approval → save/use an optional lesson plan → record actual work → submit → leadership approval. Check reported progress before approval and confirmed progress afterward. Also record a second scheduled session while the first awaits review and review a partial lesson's follow-up.

The school must supply the operational period, real assignments, actual calendar and timetable, curriculum publication decisions, and truthful first-use/missing-record reasons. The application cannot safely infer these operational decisions from existing inconsistent flags.

## Verification performed

All application fixtures were synthetic. Runtime checks used an in-memory API and a separate local PostgreSQL 17 cluster at `127.0.0.1:55471`, database `smartshule_audit_review_20261116`, data directory `/tmp/smartshule-review-20261116/pgdata`. PostgreSQL tests refuse a different host/port/database/data directory and use a disposable schema. No production migrations, seeds, messages or payment operations were run.

| Check | Command / setup | Result and limits |
| --- | --- | --- |
| Complete regression suite | `env -i PATH="$PATH" npm test -- --json --outputFile=/tmp/smartshule-review-20261116/director-complete-final.json` | **100 suites, 1,191 tests passed.** Includes 11 new director-workflow integration cases. Jest uses the repository's force-exit configuration; passing results do not prove absence of open handles. |
| PostgreSQL persistence | `env -i PATH="$PATH" SMARTSHULE_REVIEW_DATABASE_URL=<guarded-local-url> npm test -- --runTestsByPath tests/integration/postgres_guided_planning_persistence.test.ts` | **4 tests passed:** first-use/calendar reload, proposal publication gate, returned scheme comments/reviewer reload, direct scheduled work reported then confirmed after approval. Fixture schema tests adapter behaviour, not a full production migration replay. |
| Backend compilation | `env -i PATH="$PATH" npm run build -- --outDir /tmp/smartshule-review-20261116/director-backend-dist` | Passed. |
| Frontend type check | `npm run lint --prefix Frontend/smartshule` | Passed (`tsc --noEmit`, not a separate ESLint check). |
| Web build | `env -i PATH="$PATH" npm run build --prefix Frontend/smartshule -- --outDir /tmp/smartshule-review-20261116/director-web-dist` | Passed. Existing oversized bundle and static/dynamic import warnings remain; entry bundle approximately 1.08 MB before gzip. Native packaging was not run. |
| Browser, admin and teacher | Temporary Puppeteer harness `/tmp/smartshule-review-20261116/director-browser.cjs`, localhost API 18117 / web 18119 | **7 checks passed:** sidebar first item, calendar controls, publish-to-timetable action, first-use decision, timetable selectors, teacher roadmap without calendar setup, 390px layout without horizontal overflow. |
| Browser, future planning | Temporary harness `/tmp/smartshule-review-20261116/director-browser-future.cjs` | **4 checks passed:** 2026/2027 mismatch displayed, correction opens existing settings, published 2027 calendar hands 2027 scope to timetable, operational year stays 2026. No browser JavaScript errors. Synthetic flags restored afterward. |
| Whitespace | `git diff --check` | Passed. |

The integration scenarios cover first use in Term 3, approved unfinished carry-forward without modifying the previous scheme, later missing history with an audited exception, future planning without rollover, partial and repeated outcomes, direct records without a lesson plan, and a complete assigned-teacher-to-approved-record workflow. Server denials cover unauthorized first-use decisions, fake approved record creation, unsubmitted record review, invalid timetable scope and curriculum edits outside approved lesson outcomes.

Browser requests were restricted to localhost; external fonts were blocked, so icon-font appearance was not a hosted-assets verification. Builds and tests do not establish that the deployed production revision has this behaviour. Hosted acceptance with real school configuration is still required after release. A rare process interruption during a curriculum proposal's reserved `PUBLISHING` state may require administrator investigation; publication is not claimed to be one database transaction across the configuration queue and catalog.

Production privilege exposure and other unresolved database findings from the existing audit are outside this workflow change and remain subject to their separately documented remediation. No production settings were silently corrected.

## Relaxed preparation workflow — 17 November 2026

This follow-up supersedes the earlier requirement to resolve first-use/missing prior history before saving coverage. Assigned teachers can now open, save and submit coverage from published curriculum while calendar/timetable setup or previous-term reconciliation is pending. Previous-term status and genuine first-use/missing-record decisions are retained for leadership follow-up, displayed in a collapsed section; no historic scheme is invented and no decision is automatically recorded. Continuity now returns canPlan=true with requiresAdminFollowUp where history needs attention. Class/subject permissions, optional school-configured subject sequencing and approval gates remain enforced.

Calendar/timetable setup remains necessary to create dated scheme teaching sessions and the lesson plans/records linked to them. Scheme drafts with saved allocations can be opened, but scheduled session details cannot be generated until usable real periods exist. The teacher's next action therefore points to coverage preparation/review rather than leaving the teacher at a dead-end setup message. The web Start planning handler and button both permit authorized draft access without schedule readiness.
