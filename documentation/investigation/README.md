# Grace Seeds School investigation — school-001

Investigation: 12–13 November 2026. Changes are local and have not been deployed. Production PostgreSQL access was through an independent client with `default_transaction_read_only=on` and a repeatable-read, read-only transaction. Application startup, migrations, tests, authentication, and portal workflows ran against a separate PostgreSQL 17 cluster under `/tmp/smartshule-investigation-pg`, port **55439**, database **smartshule_investigation**. No production repair has been applied.

## Assessment evidence and findings

The production snapshot captured on 12 November contains **1,930 summative rows**, all under `term-2026-3` / `year-2026`; no summative rows for other periods were available to establish whether those periods had the same data problem. There are two catalogue records for each 2026 term, including `term-2026-3` and `term-2026-t3`.

Compared with the 4 November pre-catalogue snapshot:

- All 1,930 assessment IDs survive; stored strand scores are unchanged.
- 1,250 learning-area links changed. These match the explicit updates in `database/migrations/20261104_global_subject_catalogue_and_reference_repair.sql` (committed in `fdb19721`, 5 November). The migration repaired cross-grade subject links; its existence alone does not establish that marks were deleted.
- There are 981 learner/subject/year/normalized-term keys, 739 duplicate groups, and 949 extra physical copies. Seven groups disagree in score or performance level. No SQL join is multiplying these rows: duplicate rows already exist in storage.
- 22 physical rows, representing 11 Grade 1 CRE results, contain raw marks above their stored maximum of 100. Available November evidence already contains these values, with creation dates on 22 October and update timestamps on 23 October. The original Grade 1 marking sheet or a verified earlier version for these learners is unavailable. **It is not established whether the score, maximum, or an earlier conversion was wrong.** Neither a maximum of 150 nor dividing marks by ten is justified by the evidence.
- Fourteen legacy `la-general` rows contain an object keyed by subject instead of a strand array. Both their learner IDs and subject link are absent from the current catalogues. These require identity reconciliation, not a guessed link based on an ID suffix.

Original-upload comparisons provide a stronger distinction between missing records and hidden results:

- `scripts/imports/pp1_term3_2026_marks.sql`: **228/228** uploaded raw scores and maxima match current rows, including the 38 learners explicitly present in the source. The learner explicitly excluded by that source must not receive invented zero marks.
- `supabase_grade3_assessment_2026.sql`: 336 physical insert rows represent **168 logical results**, because the import deliberately repeats each result under two term-ID spellings. **All 168 original logical scores remain present.** Forty-two exact `envi` row IDs are absent, but their 21 logical Environmental results remain under `senv`/`env` IDs. Five Grade 3 logical results have disagreeing copies. For example, an anonymized Environmental result has both 70/100 and 10/100 copies. Original source marks must not be overwritten by choosing whichever duplicate has the highest or latest score.
- The October SQL backup contains a different 56-learner cohort, with no overlap in learner IDs, admission numbers, or exact first/last-name pairs with the current 168 learners. Its 410 assessments cannot safely be restored into this cohort. It does not establish the correct Grade 1 scores.

### Why percentages and results diverged

1. **Invalid stored score/maximum pairs.** A 150/100 pair mathematically yields 150%. The former Parent calculation and summative table displayed that ratio; some report calculations instead capped it at 100. The cap concealed the inconsistency. The upload use case now rejects non-finite scores, invalid maxima, and raw marks above the maximum. Existing invalid records remain intact and are explicitly flagged.
2. **Different units in the broadsheet.** The backend preferred report `rawScore` over percentage `score`, or averaged raw strand marks without accounting for their maxima. A genuine 30/40 could consequently appear as 30 rather than 75. The raw-score preference was introduced in `4415c2ab` on 31 October; the earlier averaging logic dates to `054aaed1` on 9 October. Broadsheets now calculate from paired score/maximum records and preserve real zero scores.
3. **Parent result truncation.** `latestEvaluations: summatives.slice(0, 5)` returned only five physical rows. Repeated imports could occupy those five positions and conceal other subjects. This dates to `734a9fa7` on 17 October. The Parent response now includes all logical subject/period results, retains duplicate IDs for review, and flags conflicts. The Admin and Teacher summative responses use the same presentation calculation.
4. **Learner ID persistence.** The upload resolved an admission number to a learner, then saved the original input as `studentId`. It now saves the resolved learner's ID. This prevents a valid upload from becoming inaccessible to queries using learner IDs.
5. **Term fallback parsing.** `includes('2')` could interpret the year in `term-2026-t3` as Term 2 when an exact term catalogue entry was unavailable. This fallback dates to `d276a00c` on 26 October. Parsing now uses the terminal term number. Both historical Term 3 spellings are covered in PostgreSQL regressions.
6. **Persistence/migration failures.** Upload persistence depended on a composite unique index that could not exist while duplicate data remained. A failed statement also invalidated an explicit transaction before the fallback query. Persistence now updates the resolved assessment ID without swallowing arbitrary database errors. Duplicate-index creation is deferred with a notice so it cannot roll back unrelated supplemental schema changes. No duplicates are deleted automatically.

The summative table and report-card schema have **no publication-status column**. The investigation therefore cannot attribute disappearance to an unpublished flag or claim a publication lifecycle that the current application does not implement. Parent child-link authorization and report-card fee-clearance restrictions remain relevant existing access rules. Regressions verify linked-parent access and denial of an unrelated child; teacher-scope regressions also pass.

### Representative results

These are observed through the **local application using restored school data**, not live production HTTP requests. Production application GET handlers can write derived data, so they were not used for the read-only production investigation. The old 150% path is established from stored data and source calculations, not a captured live Render response.

| Anonymized learner | Subject / period | Stored raw | Stored maximum | Local Admin, Teacher, Parent API | Admin / Teacher UI | Parent UI |
|---|---|---:|---:|---|---|---|
| learner-6b575d96 | CRE, Term 3 2026 | 150 | 100 | No percentage; verification flag, original pair retained | Review | Score requires verification |
| learner-57cecce8 | Environmental Activities, Term 3 2026 | 95 | 100 | 95% in each role | 95% | 95% |
| Isolated regression fixture | Mathematics, Term 3 2026 | 30 | 40 | 75%; retrievable using either term spelling | PostgreSQL regression | PostgreSQL regression |

Additional operational IDs and source checksums are in [assessment-review-manifest.json](assessment-review-manifest.json). The manifest contains no names, phone numbers, or admission numbers. Null proposed corrections are intentional: unresolved marks must be verified before a repair is proposed.

## Pages and workflows

The audit uses real local role profiles and navigation handlers, at **390 × 900**, **768 × 900**, and **1440 × 900**. It blocks application requests to external services; font hosts are permitted. The route matrix is recorded separately in `route-audit.json`: **95 role-specific destinations, 285 viewport checks**, all with rendered content, no JavaScript crashes, and no document-width overflow after focused retests. It covers 56 Admin, 27 Teacher and 12 Parent destinations. Expected missing-timetable responses are recorded.

Fixed locally:

- Header search and staff/parent switching controls forced the phone header wider than the viewport. Search now appears at suitable widths; the existing sidebar retains role switching. Icon dimensions are constrained while fonts load.
- Narrow tab bars and controls in staff management, teacher profile/salary, library, invoices, finance, payroll, signatures, notices, attendance, diary, curriculum tracking, formative assessments, fee search, and user management now wrap or remain within their panel. Report-card tables scroll horizontally on screen while retaining print layout.
- Teacher geofencing unnecessarily requested Admin-only clock-in history and faculty roster, receiving 403 responses. It now renders the existing personal clock-in card.
- Teacher broadsheets initially selected an unassigned class and could request all streams before assigned-stream loading finished. Class choices now follow assignments; loading waits for the stream selection.
- Whole-term report buttons called nonexistent `getTermsByYear`; they now call `getTerms`.
- Admissions decisions called nonexistent `updateStatus`; they now call the existing approve/reject methods and handle missing applications.
- Credit-utilization preview and submit sent `amount` instead of `amountToApply`.
- Timetable initialization read nonexistent `assignedClassId`; it now uses `assignedStreamInfo.classRoomId`.
- Subject creation omitted required `educationLevel`; the payload now derives the supported education-level value from the chosen grade.
- Shared API requests had no deadline and could leave an in-flight request/loading state indefinitely. Requests now abort after 45 seconds and release their cache entry; caller cancellation is preserved.
- General rate limiting ran before authentication, pooling users behind one IP. Verified optional authentication now precedes the general limiter, allowing its existing per-user key to work.

Timetable requests for cohorts with no saved timetable return 404. Those are missing timetable data with an empty/error view, not JavaScript crashes; no fictitious timetable was inserted. Consent and lunch failures seen on the first restored-backup audit were caused by missing later schema changes in that backup. Production read-only schema inspection confirmed those fields/tables already exist there; the existing migrations were applied only to the local database for retesting.

The browser navigation audit is a route/layout smoke test, not a claim that every destructive or external workflow was executed. No live SMS, email, payment, WhatsApp, or production mutation was tested.

## Postal address

The school API presentation and applicable hardcoded contact templates now use exactly **P.O Box 12-20123**. Updated surfaces include login/admission contact text, notices, attendance exports, broadsheets, report cards, timetable output, invoices/receipts/credit receipts, fee reports/structures, payroll, stationery requirements, and email/WhatsApp fallback contact templates. Geofence physical-location defaults are not a postal-address field.

The stored production school setting still has its previous street address. [repair-school-address.sql](../../scripts/investigation/repair-school-address.sql) defaults to a **read-only dry run**, targets only `school-001`, checks the expected old value, and backs up the prior address before a reviewed apply. [rollback-school-address.sql](../../scripts/investigation/rollback-school-address.sql) restores that address and refuses to overwrite a subsequent address change. Dry-run, apply, and rollback were exercised successfully against the isolated database.

## Lesson plan format

Preview and PDF export now share the same data model and section order:

1. Six-column School, Level, Learning Area, Date, Time, Roll table.
2. Week and Lesson Number; Strand; Sub Strand; Specific Learning Outcomes; Key Inquiry Question(s).
3. Three-column Core Competencies, Values, PCIs table.
4. Learning Resources; timed Organisation of Learning with Introduction, Lesson Development and Conclusion.
5. Extended Activities; Teacher Self-Evaluation with notes space.

The school, class and subject catalogues are loaded rather than substituted with sample names. Nested roll data is supported. Week, lesson number, time and PCIs now persist through domain/API/PostgreSQL metadata. The creation form accepts real teacher/learner activities and competencies/values rather than silently inserting generic activities. Missing historical fields show “Not recorded”. Multi-lesson PDF export starts each lesson on a fresh page and repeats table headings on continuation pages.

The named reference `GRADE 3 TERM 3 MATHEMATICS LESSON PLANS_6a7be90ba5c4f.docx` was **not available in the repository, accessible Documents search, or a connected document session**. Exact Word typography/spacing comparison remains unverified. Production also contains **zero saved lesson plans**. The supplied written section requirements were implemented and verified with an explicit local formatting fixture, using school/class/subject metadata. This is not a claim that actual saved school lessons or the unavailable Word file were compared.

Verification artifacts: `lesson-plan-fixture-single.pdf` (one A4 page) and `lesson-plan-fixture-multiple.pdf` (two lessons, including long content, three pages). Heading order, long-content marker, both self-evaluation sections and page counts were checked; first and continuation pages were visually inspected. These are test fixtures, not school teaching records.

## Validation and review steps

- Backend TypeScript build passed.
- Frontend TypeScript check and production bundle build passed. Vite reports the existing static/dynamic import warning for the summative view.
- Eight regression suites passed, **72 tests**, with environment variables pointing at the isolated local database. Seven tests directly exercise PostgreSQL, including 150/100 flagging without mutation, paired maxima, genuine zero, admission-number persistence, both term IDs, parent access, the former five-result cutoff, and lesson metadata round trips.
- Existing ranking fixtures were corrected to supply maxima and to return learners for the engine's unscoped preload query; ranking assertions remain intact.
- Browser role/API and responsive evidence is summarized in the companion JSON files. Navigation was checked at phone/tablet/desktop widths. PDF checks cover lesson-plan single/multi export; other contact-template changes were checked in source/builds and route rendering, not by generating every financial document.

Local PostgreSQL regression command:

```sh
INVESTIGATION_DATABASE_URL=postgresql://don@localhost:55439/smartshule_investigation \
DB_TARGET=local LOCAL_DATABASE_URL=postgresql://don@localhost:55439/smartshule_investigation \
DATABASE_URL=postgresql://don@localhost:55439/smartshule_investigation DB_TYPE=postgres \
npm test -- --runTestsByPath \
 tests/integration/assessment_investigation_local.test.ts \
 tests/unit/report_card_comparisons.test.ts \
 tests/unit/marks_upload_portal_and_subject_access.test.ts \
 tests/unit/broadsheet_rankings.test.ts \
 tests/unit/teacher_scoping_and_idor.test.ts \
 tests/unit/parent_ediary_class_filtering.test.ts \
 tests/unit/admin_sidebar_navigation_and_admissions.test.ts \
 tests/unit/whole_term_school_report.test.ts
```

A fresh backup restore needs the existing 4 November subject, 7 November parent-link, and 8 November consent migrations plus the application's supplemental schema before these current-schema checks. The new lesson metadata migration is `database/migrations/20261112_lesson_plan_document_metadata.sql`; review it before deployment. The PostgreSQL regression suite refuses a non-local/non-investigation database and rolls back its fixtures. Other selected suites are unit tests with mocked/in-memory repositories; none use production.

Outstanding production review:

- Apply the postal-address repair only after reviewing its dry-run output.
- Verify the correct score/maximum for the 22 over-maximum rows (11 results), seven conflicting duplicate groups, and identities behind the 14 legacy orphan rows. Preserve all originals until resolved. Do not infer a maximum, cap a percentage, restore the unrelated October cohort, or rerun the historical import wholesale.
- Review duplicated imports and their assessment intent before deleting physical copies or enforcing the deferred unique indexes. Conflicting copies are currently flagged and excluded from numerical ranking rather than silently selected.
- Provide the named Word reference for exact layout comparison. Actual saved-lesson content verification will require a school lesson to exist locally or a verified source plan.
