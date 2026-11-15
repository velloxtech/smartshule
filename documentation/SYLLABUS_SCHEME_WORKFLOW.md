# Syllabus coverage and flexible sub-strand schemes

Updated 15 November 2026. Planning follows the children’s learning pace, not fixed week boundaries.

## Teacher flow

1. Save the syllabus coverage for the assigned class, stream, learning area, year and term. Lesson counts are initial pacing estimates, not limits on time spent teaching a sub-strand.
2. Open the scheme draft dossier or Scheme of Work creation. Select **Add scheme lesson details** / **Plan saved sub-strands**.
3. Choose the **Sub-strand**. All its teaching sessions appear together, even when their actual dates span several weeks. There is no Previous Week / Next Week control or week-based completion requirement.
4. Complete the teaching session’s outcomes, inquiry questions, experiences, resources and assessment methods. Save it independently. Dates and times identify real timetable sessions; they are not deadlines for completing the sub-strand.
5. If the children need more time, use **Continue this sub-strand**, choose an eligible teaching period and record the reason. More sessions can be planned than initially estimated. If another draft topic occupied the chosen period, its original entry and reason for deferral remain in history, and its sub-strand remains in the coverage list for follow-up. Approved lessons, lesson plans and recorded teaching cannot be overwritten. Where every period is protected, an administrator must provide another appropriate timetable/calendar period.
6. Submit completed sessions for review, optionally for only the selected sub-strand. Other sessions remain drafts. Draft content can be prepared before source coverage approval; the source coverage must be approved before scheme sessions are submitted. Approval applies only to the submitted entries and does not mark the whole sub-strand learned or finished.
7. Create a lesson plan from an individually approved scheme session. The linked form shows the sub-strand, date and time without Week / Lesson Number inputs. Earlier approved sessions remain usable while later ones are drafts or under review.
8. Records of work can be submitted independently of preceding calendar weeks. Each record still needs its own review before it contributes confirmed coverage. The passage of a week does not complete a sub-strand or block continued teaching.

Academic year/term and actual timetable periods remain necessary for school data isolation and historical reporting. Calendar week numbers are retained internally for existing reports and integrations; they no longer organize or gate the new scheme editor. Explicit administrator-configured learning-area sequencing is separate and remains enforced.

## Implementation and data protection

- `SubStrandSchemePlanner` is used by web, packaged app and the draft dossier. `WeeklySchemePlanner` remains only as a compatibility re-export.
- Existing scheme, slot and approved entry IDs are retained. Pacing changes create a new draft entry and archive any displaced draft entry with its reason. They do not rewrite approved content or delete deferred topics.
- `POST /api/v1/curriculum/schemes/:id/sessions/continue` checks teacher ownership, school/assignment scope, expected revision, saved curriculum selection, a real eligible period and existing teaching links before changing pacing.
- Coverage policy checks curriculum membership, not an estimated lesson-count cap or original slot reservation. Each new continuation still requires scheme approval before lesson-plan creation.
- Existing partial-review metadata (`submittedEntryIds`, `approvedEntryIds`) and `PACING_ADJUSTED` JSON history retain approval scope and pacing history. Existing `/weekly` API names and stored calendar week metadata are retained for compatibility.
- Removed the preceding-week approval gate from records-of-work creation/submission. Assignment checks, duplicate-session checks, individual review and official-coverage permissions remain.
- Corrected the in-memory record repository to retain `planningLink`, matching PostgreSQL mapping; otherwise links needed to protect recorded work could disappear in local execution.
- No new SQL columns or production migration are required by this change; the existing planning schema must already be installed. No production data, payments, messages or deployment were touched.

## Verification

- Targeted pacing/diary run: **2 suites / 31 tests passed**.
- Final workflow/API run: **16 tests passed**, including a sub-strand spanning two calendar weeks beyond its original one-session estimate, deferred-history preservation, protected approved/recorded work, stale submissions and authenticated continuation.
- Browser: **4 desktop/phone checks passed** at 1440px and 390px using synthetic stateful fixtures. The same sub-strand displayed both dates without week navigation and retained the deferred topic’s history. External requests were blocked.
- Full regression run: **96 suites / 1,152 tests passed**. The additional final API case was verified in the separate 16-test workflow run. Backend TypeScript, frontend lint/type checking and production build passed. Logs are in `/tmp/smartshule-flexible-pacing`; temporary preview entries were removed. PostgreSQL execution, packaged APK/Electron execution and physical devices were not exercised. Existing JSON persistence mappings were inspected statically.

Changes remain local and uncommitted.

## Visible approval access

Admin, School Admin, Super Admin, Head Teacher and Deputy Head Teacher share the same curriculum review permission. Teachers do not receive approval controls.

Open **Schemes & Lesson Plans** and select **Awaiting review** to filter both submitted coverage and submitted scheme sessions. Each scheme card and its **View Details** modal has a **School leadership review** panel:

- **Approve coverage** / **Return coverage with comments** review the submitted source coverage, even if no scheme lesson entries have been prepared.
- **Approve scheme** / **Return scheme with comments** review the submitted scheme-session selection. Coverage must be approved first.
- Approval buttons remain visible but disabled for drafts or already approved work, with a reason describing the current state. Opening a draft does not authorize bypassing submission.
- Approval actions are independent of the sub-strand editor’s calendar/catalogue loading. Failed scheme-list requests display their error and a retry action instead of silently producing an empty list.

Verification for this access change: **22 workflow/HTTP tests passed**, including both approval stages for all five reviewer roles and denial of teacher/unsubmitted-draft approval. **27 browser cases passed** across Admin, Head Teacher and Deputy Head Teacher, list/modal, coverage/scheme and desktop/phone combinations; drafts, teacher visibility and loading failure were also checked. Frontend lint/type checking and production build passed. Browser checks used synthetic fixtures with external requests blocked, including an unavailable calendar to verify approval visibility. Artifacts are in `/tmp/smartshule-approval-access`. No production approval or deployment was performed.

## Approved schemes inside lesson-plan creation

Opening **New Lesson Plan** without a preselected source now displays an **Approved scheme picker** in the same modal. Teachers can search the authorized scheme list, select a scheme, filter approved sessions by sub-strand, and choose **Use this approved session**. The form opens in place with the correct source entry, class, stream, learning area, academic period, date/time, outcomes, inquiry questions and resources.

Schemes with individually approved sessions remain available while their other work is still a draft. Draft-only and archived-only schemes are excluded. Session choices are rechecked against the current timetable and current per-entry approvals; cancelled, archived and unapproved sessions cannot be selected. Existing lesson plans are labelled and disabled to avoid accidental duplicate creation. The server’s approval, assignment and source-link checks remain unchanged.

The picker has empty, loading, search and retry states. Late responses cannot replace a newly selected scheme. Returning to the picker clears the prior source context, and reopening the modal starts with the picker again. Direct creation from an approved scheme session and revision sources remains supported. Read-only scope values are retained even when historical metadata lookups return no options. New forms use the selected timetable duration and reset previous teaching-step text.

Verification: **12 desktop/phone browser checks passed**, including actual form submission into a synthetic API, partial approvals, metadata fallbacks, historical periods, stale response handling, revoked approvals, duplicate-plan prevention, errors/retries and direct source entry. **22 existing workflow/permission tests passed**. Frontend lint/type checking and production build passed. Artifacts are in `/tmp/smartshule-approved-picker`; preview entry points were removed. No production API, database or deployment was used.

### Complete scheme content in lesson plans (2026-11-15)

Lesson creation now preloads the approved session's learning experiences and assessment methods alongside outcomes, inquiry questions, resources, strand/sub-strand, class/stream, learning area and session date/time. Teachers can refine the lesson-specific experiences and methods. These two arrays pass through API validation and the domain model into the existing `lesson_details` JSONB column; no additional migration is required beyond the existing lesson-details migration. Omitted arrays inherit the linked scheme content on the server. Lesson steps expose their existing assessment-criterion field. Preview and PDF use the same sections, including the new content; older records without these fields fall back to their linked scheme where available. Explicitly saved empty arrays remain empty. Reflections remain recorded after teaching.

Verification uses synthetic browser fixtures, in-memory workflow tests and a mocked PostgreSQL query round trip (not a live database). Artifacts are `/tmp/smartshule-lesson-values-*`; no production database, migration or external operation was used.

Validation result: 23 backend workflow/persistence checks passed; the final metadata persistence check also passed after retaining missing-field compatibility for older records. Twelve desktop/mobile browser scenarios passed, including payload inheritance and preview/PDF content assertions. Frontend TypeScript, backend TypeScript and frontend production build passed (existing bundle-size warnings remain). PostgreSQL was mocked; no live database round trip was performed.

### Default syllabus view

Opening an existing syllabus plan now loads Coverage progress automatically in both web and app presentations. Coverage allocation remains available as a tab; new plans or plans requiring calendar/timetable setup open allocation so teachers can prepare them. Progress loads with the selected scope and ignores stale responses when the selection changes. Verification: frontend TypeScript check and whitespace check.

### Records of Work deletion

The Records of Work list now shows a labelled Delete action with confirmation and in-progress protection. Existing permissions remain: teachers delete their own unapproved work; administrators, headteachers and deputy headteachers may also delete approved records in their school. The server rejects other roles and cross-school deletion. Linked scheme and lesson-plan records are retained. Deleting a record removes its corresponding curriculum-tracker daily log and returns the week's coverage for review only when no other endorsed log supports that week. The syllabus/session projections derive record status from remaining records. No existing records were deleted during implementation. Verification: frontend TypeScript, 16 existing diary pipeline tests and focused deletion/coverage tests using disposable in-memory/mocked repositories.

### Scheme document preview

View Scheme of Work opens a landscape-style document with class, learning area, school, year and term headings and ten bordered columns: week, lesson, strand/theme, sub-strand, outcomes, inquiry questions, learning experiences, resources, assessment methods and reflection. Edit scheme explicitly opens the existing sub-strand planner, retaining partial submissions and reviewer actions. Weeks are session references and do not limit sub-strand pacing. Preview and PDF share active-entry row extraction; missing content and reflections are left blank rather than fabricated. The PDF uses landscape A4 with widths totaling the usable page width. Metadata uses actual school/class/area and academic year/term lookups. Desktop/mobile browser checks verified default document rendering, metadata, ten columns, saved content, archived-entry exclusion and horizontal scrolling. Frontend type checks passed; build log and screenshots are in `/tmp/smartshule-scheme-document`. No persisted teaching data was changed.

### Records of Work document format

View Details now opens a document with the actual school name/logo, teacher, grade/class/stream, learning area, year and term, followed by Date, Strand/Sub-strand, Brief description of work done and Reflection. Saved narrative and structured reflection are included; zero attendance counts are retained and missing details are blank. Ruled blank rows provide the reference form appearance. Additional objectives, resources, comments and review information remain accessible beneath the document. Both single-record download and filtered-list PDF export reuse the same saved-row mapping; multi-record exports separate teacher/class/stream/subject/year/term scopes onto distinct documents. No training-university branding or student admission identifiers are invented. Desktop/mobile fixture checks passed for four-column layout, saved content, structured reflection, zero counts, blank rows, horizontal scrolling and PDF page separation. Logs/screenshots are in `/tmp/smartshule-record-document`; checks do not use production data.

### CBC lesson-plan template and shared school branding (2026-11-15)

The supplied CBC template was inspected locally, including the lesson flow and assessment rubric. Lesson plans now follow its order: teacher name/registration, grade, learning area, strand/sub-strand, date/time, outcomes, resources, competencies, PCIs, values, links to other learning areas, inquiry questions, lesson flow (stage/time, experiences, learning points, resources), community service, non-formal activities, remarks and the four-level assessment rubric. Existing scheme experiences, assessment methods, extended activities, attendance and step assessment criteria remain represented. No publisher watermark or personal download metadata is copied.

New optional template fields are editable in lesson creation, API-validated and persisted through `LessonPlan` and the existing `lesson_details` JSONB column. Per-stage fields persist with steps. Supplying a rubric requires at least three complete criteria covering Exceeds, Meets, Approaching and Below expectation. Existing records without these fields remain readable; previews show blank rubric rows instead of invented assessments. No new database migration is needed beyond the existing lesson-details migration.

`SchoolDocumentHeader.tsx` shares report-card-style school logo, name, address, contacts, motto and maroon title strip across lesson plans, schemes and Records of Work, in screen previews and PDFs. All coloured document-table headings use maroon (`#7a1228`), replacing blue. Configured logo loading uses the existing report-card fallback assets, handles missing images, and caps embedded logo resolution for smaller exports. Document school details use configured records rather than hardcoded contacts. Scheme PDFs use a shared exported document function; Records of Work retain scope-separated exports.

Verification: 24 backend workflow/persistence/schema checks passed, backend and frontend TypeScript checks passed, and the frontend production build passed with existing bundle-size warnings. Six synthetic desktop/mobile previews and all three PDF generators passed checks for school branding/logo, maroon headings and template fields. The lesson-plan PDF was rendered and visually inspected over both pages. Artifacts and fixture sources are in `/tmp/smartshule-template-documents`. PostgreSQL persistence was checked with a mocked query round trip, not a live database. No production data, migrations, external messaging or deployments were used.

Final form verification: all 12 desktop/mobile picker scenarios passed with additional assertions that the lesson payload contains other learning areas, community-service/non-formal activities, three complete rubric criteria, and per-stage learning points/resources. Temporary browser entry files were removed from the repository after verification; fixture sources remain in the artifact directory. The final frontend type check passed.
