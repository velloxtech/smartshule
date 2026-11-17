# Teacher timetable access

Implemented locally on 16 November 2026 against baseline `e06bd59f745e98dfb87cbfdb54eb44ceef49fda0`. No deployment, assignment mutation or production database operation was performed for this change. Existing unrelated work and native packaging were preserved.

## Access rule

- **My Teaching Timetable:** only lessons belonging to the signed-in teacher, across their valid class/subject duties for the selected academic year and term. Both staff-profile IDs and legacy login IDs on timetable slots are supported. Another teacher's identity cannot be selected through the API.
- **My Class Timetable:** the full grid, including other teachers and subjects, only for an active class-teacher assignment. A stream-specific duty grants that stream, not a sibling stream or a whole-class request without a stream. A whole-class duty may view the class and its streams.
- A subject duty in another class appears in the teacher's personal schedule; it does not grant access to that class's full grid.
- Teachers without a class-teacher duty can still use their personal schedule. The class selector explains the missing duty rather than exposing subject-only classes.
- Teacher timetable access is read-only. Calendar/timetable configuration remains with school leadership.

## Implementation evidence

`src/application/timetables/TimetableUseCases.ts:351` resolves the selected school/year/term; `:358` returns authorized class-teacher options; `:372` verifies full-grid access; and `:390` filters personal slots against their actual parent timetable and active assignment. Timetable school/year metadata is checked before a slot is returned, so reused identifiers or stale rows cannot cross scope.

`src/infrastructure/http/controllers/TimetableController.ts` passes the authenticated actor to both read use cases. `src/infrastructure/http/routes/index.ts` exposes `GET /timetables/access-options` and restricts every timetable mutation to leadership. `src/infrastructure/http/middlewares/teacherAssignmentGuard.ts` delegates timetable authorization to these dedicated checks; its broad subject-cohort filter no longer grants full-grid access or strips other teachers from an authorized class teacher's grid.

`Frontend/smartshule/src/components/views/TimetableView.tsx:169` uses those class-teacher options rather than the general subject/class directory, restricts stream choices and locks the teacher identity to self (`:1538`). It no longer requests the staff directory for teachers. Period changes invalidate class selections and stale responses. API enforcement remains authoritative if the browser is modified.

## Acceptance checks

`tests/integration/teacher_timetable_visibility.test.ts` adds 15 disposable in-memory HTTP tests covering:

1. Class-teacher-only class/stream choices, including sibling-stream exclusion.
2. Complete authorized class grids, retaining other teachers' subjects.
3. Denial for subject-only classes, unassigned classes and streamless requests against a stream duty.
4. Personal lessons across assigned classes, supporting profile/login identity aliases.
5. Other-teacher identity tampering, foreign-school rows and stale unassigned timetable rows.
6. Subject-only teachers with no class-teacher duty.
7. Independent future-year duties and refusal of mismatched year/term pairs.
8. Expired class duties, leadership inspection, and all four teacher timetable mutation routes returning 403 without modifying the grid.

The existing timetable persistence and director-planning tests also run. An initial regression exposed that an administrator's legacy read without an explicit term had changed behaviour; that compatibility path was restored while teacher reads remain period scoped. The first sandboxed HTTP run was blocked by localhost socket permissions and was rerun with the required execution permission. Frontend TypeScript checking passed after correcting a profile display-name type mismatch.

## Final verification

| Check | Command | Result |
| --- | --- | --- |
| Full regression suite | `env -i PATH="$PATH" npm test -- --json --outputFile=/tmp/smartshule-review-20261116/timetable-access-complete.json` | **101 suites / 1,206 tests passed**, including all 15 new timetable privacy tests and the existing persistence/planning regressions; 271.03 seconds. |
| Backend compilation | `env -i PATH="$PATH" npm run build -- --outDir /tmp/smartshule-review-20261116/timetable-access-dist` | Passed. |
| Frontend type check | `npm run lint --prefix Frontend/smartshule` | Passed (`tsc --noEmit`). |
| Web build | `env -i PATH="$PATH" npm run build --prefix Frontend/smartshule -- --outDir /tmp/smartshule-review-20261116/timetable-access-web-dist` | Passed. Existing bundle-size/import warnings remain. |
| Whitespace | `git diff --check` | Passed. |

The suite used disposable in-memory repositories and local HTTP sockets, with the repository's simulator/test settings and force-exit configuration. No production credentials were passed into the tests. Real-database suites were excluded by the standard Jest configuration; no PostgreSQL adapter/schema changes were made for this restriction. No new hosted or browser-runtime verification is claimed for this follow-up. Deployment and school acceptance on the actual portal remain outstanding.

No new database schema migration is needed. These restrictions take effect when the backend and web changes are released together. The separately documented production academic-year/current-term inconsistencies can still affect which period appears initially; this access change does not choose a new operational year or alter saved duties.

## Dashboard assignment display correction — 17 November 2026

The reported dashboard contradiction was traced statically to `TeacherDashboardView.tsx`: after loading authorized teaching cohorts, it requested the private student directory for every selected cohort, including subject-only duties. A correctly denied roster request reached the outer catch and reset the entire authorized context. The welcome card retained the already selected class label, while the selector and subjects became empty.

The authorized-context response now includes `classTeacherByStream`, calculated from the same effective-dated duty snapshot as the subjects (`AcademicUseCases.ts:1356`). `teacherDashboardCohorts.ts` prefers verified class-teacher cohorts by default and retains subject-only options. The dashboard requests a private roster only for an explicit class-teacher cohort; a roster fetch failure has its own message and leaves the assignments/subjects intact. Subject-only views hide private-roster controls and the misleading zero-enrolment card. Teacher timetable links now describe viewing the timetable. Native packaging and production data were not changed.

Verification: **45 targeted tests passed** across cohort-selection, authorization and assignment-reliability suites, including two added API regressions and four cohort permission cases. Backend compilation, frontend TypeScript checking, web build and whitespace checks passed. The earlier 1,206-test full regression result predates this follow-up; the 45-test targeted run is the verification specific to this dashboard fix.

Five localhost browser checks passed using synthetic in-memory data: class-teacher default selection; switching to subject-only West without a private-roster request; retaining both assignments after a simulated roster 403; a subject-only mathematics teacher retaining the subject without learner/guardian requests; and no browser JavaScript errors. Remote requests were blocked, so the screenshots' icon-font rendering is not a hosted-assets check. The temporary browser harness and screenshots are under `/tmp/smartshule-review-20261116/dashboard-*`. This correction is local and requires a coordinated backend/web deployment; no assignment data was recreated or changed.

## Compact dashboard replacement — 17 November 2026

At the user's request, the large assignment selector/count/shortcut card has now been replaced by **My teaching today**. The dashboard no longer has a class/subject dropdown. Class and subject selection remains on the dedicated work screens; the private dashboard roster continues to use the first verified class-teacher cohort.

`Frontend/smartshule/src/components/teacher/TeacherTodaySummary.tsx` displays up to three remaining timetable lessons, their times and class/stream, plus one primary action. It reuses the existing planning readiness response for the relevant lesson's scope; the fallback is View my timetable. Waiting-for-leadership messages do not ask teachers to configure setup. Empty, finished-day, missing-term and failed-timetable states have distinct messages. A failed timetable request is not displayed as a zero-lesson result.

`teacherTodaySchedule.ts` uses Africa/Nairobi dates/times, excludes breaks/lunch, sorts periods, excludes finished lessons and respects active term date bounds. It summarizes recurring timetable periods; official work and confirmed coverage still come from the existing record/approval workflow.

Frontend TypeScript, the web production build and whitespace checks passed. Direct date checks passed for Nairobi midnight rollover, period sorting, break exclusion, remaining/completed lessons and term bounds. Six localhost browser checks passed for the replacement layout, the Lesson Plans action, an empty day, the Record Work action, a settled 390px layout and absence of JavaScript exceptions. Timetable/readiness responses and the browser clock were mocked for these UI cases; this is not a new backend workflow certification. External fonts were blocked. Repeated browser reloads eventually exercised the local API rate limiter; the narrow-screen geometry check also covered its fallback state. Existing bundle warnings remain. No production data, saved duties or native packages were changed, and the replacement is not deployed.
