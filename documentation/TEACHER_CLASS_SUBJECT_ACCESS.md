# Class-teacher and subject-teacher visibility

The web interface and backend distinguish pastoral/class responsibility from a subject teaching duty. Native Android/mobile and desktop packaging work is deferred; no native sources or packaging were changed for this task. Backend authorization applies to requests from every client.

| Area | Class teacher for Grade 4 Alpha | Science teacher for West, without a West class-teacher duty |
| --- | --- | --- |
| Learners & Guardians directory and learner dossier | Alpha learners and their existing class-teacher details | West is excluded; direct West learner dossier requests are forbidden |
| Assessment roster | Alpha learner identities | West learner identities needed to record Science marks; no guardian links, medical conditions or fee details |
| Marks subject choices and writes | All valid subjects for Alpha | Science only for West |
| Assessment reads | Alpha subjects | West Science only; another subject's assessment URL is forbidden |
| Master Broadsheet and export data | Alpha subjects | Science columns, Science-derived totals and permitted learners only |
| Whole-school comparisons | Reserved for school leadership | Reserved for school leadership |

## Enforcement

- `src/application/shared/TeacherAssignmentAccess.ts`: `canClassTeacher` checks an explicit active class-teacher assignment, including stream, school, academic year and effective dates. Subject duties and legacy profile caches do not grant directory access.
- `src/application/students/StudentUseCases.ts`: directory lists and dossiers require class-teacher responsibility. `listAssessmentRoster` returns an explicit minimal identity projection and verifies the requested class/stream/subject/period. Scope checks are reused per cohort within the request.
- `src/infrastructure/http/controllers/StudentController.ts` and routes: `GET /students/assessment-roster` is separate from `/students` and `/students/:id`.
- `src/infrastructure/http/middlewares/teacherAssignmentGuard.ts`: directory routes enforce class-teacher boundaries, while assessment records remain subject-filtered. Staff's own guardian portal remains a separate family relationship. Broadsheet authorization and derived totals are enforced in its use case, rather than filtering an already calculated full sheet.
- `src/application/cbc/CbcAssessmentUseCases.ts`: marks entry, templates, validation and commits use active school/period/class/stream/subject authorization. All assessment rows use the learner's actual stream. Historical term IDs are passed through; cached profile arrays are not permissions.
- `src/application/academics/BroadsheetUseCases.ts`: subjects are restricted before evaluating each stream, calculating totals, means and rankings. Mixed-stream requests preserve each stream's individual subject scope and exclude unassigned streams. Teacher requests do not generate whole-school learner comparisons. Leadership access is retained.
- `Frontend/smartshule/src/components/modals/UploadMarksModal.tsx`: uses the minimal roster and `subjectsByStream`, refreshes the authorized context for the selected year/term, and requires an eligible stream when the teacher has no whole-class duty. Class-level subject unions cannot expose Alpha's other subjects while West is selected.
- `Frontend/smartshule/src/components/views/MasterBroadsheetView.tsx`: selectors use period-aware authorized assignments, school-wide scope is hidden from teachers, the visible-subject boundary is explained, and stale requests cannot replace the current sheet.
- Subject assessment and lesson-plan roster consumers use the minimal endpoint. The main Learners & Guardians list continues using the class-teacher-only directory.

## Verification

All fixtures use disposable in-memory repositories or synthetic browser data. No production assignments, learners, marks or other records were changed.

- `env -i PATH="$PATH" npm test -- --runTestsByPath tests/integration/teacher_class_subject_visibility.test.ts tests/unit/teacher_assignment_current_term.test.ts tests/unit/broadsheet_rankings.test.ts tests/unit/teacher_assignments_promotion_and_marks_upload.test.ts tests/unit/examination_eight_subjects_broadsheet_and_summative.test.ts`: 46 tests passed. Covers Alpha full access, West Science-only access, directory rejection, minimal projection, assessment URLs, mixed streams, school leadership and revocation.
- Full existing regression run: 99 suites, 1,180 tests; 97 suites passed, with five failures in two suites. Their obsolete subject-teacher dossier expectation and incomplete school/grade/historical-effective-date fixtures were updated. Both affected suites subsequently passed: 12 marks portal tests and six privacy/IDOR tests. No authorization check was relaxed to satisfy those fixtures.
- Browser fixtures exercised the actual web marks form at wide and narrow viewport sizes, and the Master Broadsheet: Alpha has full subject choices, West has Science only and West learners, switching back restores Alpha, and school-wide scope is absent. Narrow viewport checks were web responsiveness checks, not native mobile application work.
- Backend `npx tsc --noEmit`, frontend `npm --prefix Frontend/smartshule run lint`, and frontend `npm run build -- --outDir /tmp/smartshule-teacher-visibility/build-final`: passed. Existing bundle-size warnings remain.
- Logs, screenshots, browser fixture sources and full regression JSON are under `/tmp/smartshule-teacher-visibility/` and `/tmp/smartshule-teacher-scope-*`. Temporary browser entries were removed from the repository after checking.

Database-dependent suites remain disabled in the standard isolated test configuration. No live database round trip, native application build, migration, deployment, payment or messaging operation was performed.
