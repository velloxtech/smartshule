# SmartShule interface design review

Review date: 15 November 2026. Starting commit: `7e479bd6`. Existing uncommitted work was preserved. This review changes presentation, not application workflows, APIs, permissions, calculations or stored data.

## Design baseline

The shared web theme (`Frontend/smartshule/src/index.css`), established portal screens, and native theme (`Mobile/lib/theme/app_theme.dart`) define the baseline: maroon primary actions, teal secondary accents, blue-gray card surfaces, dark slate text, restrained borders, rounded controls, and compact headings. The native theme explicitly identifies `#7a1228` as the official primary maroon; the shared web primary and browser theme metadata now use that color too.

Status colors remain meaningful: green for success, amber for attention, red for errors or destructive actions, and blue for information. Public marketing pages retain their intentional cream/gold styling. Receipts, lesson documents, report templates, signature ink swatches, and other printable content retain their specialist visual treatments.

## Scope and findings

All 143 React components were inventoried: 71 views, 49 modals, eight landing components, six common components, three curriculum components, two authentication components, two legal components, and two shell components. The app entry point, global stylesheet, HTML metadata, native theme and all 11 native screen files were also inspected. Capacitor and Electron use the same React interface; their appearance therefore inherits the web changes. Native Flutter uses its own theme.

The most substantial inconsistencies were hard-coded white/gray surfaces and text, unrelated blue/purple action colors and focus rings, a navy signature-management banner, and unfinished planning controls. Updated outliers use semantic theme colors and existing layout patterns. Existing responsive grids and contextual status distinctions were retained.

### Shared defects corrected

| Issue | Evidence | Result |
| --- | --- | --- |
| Shared primary maroon differed from the native official theme and several established screens | Web `--color-primary` was `#800000`, web maroon was `#7b1c35`, native primary was `#7a1228` | Shared web primary, maroon alias, surface tint and browser metadata use `#7a1228` |
| Every desktop modal size was forced to 32rem | The `.modal-dialog` desktop rule followed the size variants at equal specificity | Default size precedes variants; `modal-dialog-2xl` measures 768px at desktop and 366px in a 390px viewport |
| Hover/opacity utilities could acquire a card background and shadow unconditionally | Unlayered `[class*="bg-surface-container-lowest"]` matched utility substrings, including hover/opacity variants | Only explicit `.portal-card` receives that override; utility classes keep their own behavior |
| White documents inside main content could become blue-gray cards | Broad `main [class*="rounded-…"].bg-white` overrides | Removed the heuristic; outlier cards explicitly request theme surfaces while paper remains white |
| Planning actions were plain text and field appearance differed between app/web planners | Unstyled calendar/sequence buttons and different local `input` constants | Added shared `.ui-button`, primary/danger variants and `.ui-field`; adopted them in both planners, the term planner and closing-date editor |
| Keyboard focus lacked a shared visible treatment | Individual controls used inconsistent rings or removed outlines | Added a base `:focus-visible` outline for links, buttons, inputs, selects, textareas and disclosure summaries |
| Coverage numbers and approval badges could exceed a narrow card | Records of Work phone preview | Metric rows now wrap |
| Passkey dialog header compressed its close control on phones | Phone preview of `BiometricDevicesModal` | Responsive padding/title, wrapped badge, non-shrinking close control, decorative icon hidden on small screens |
| Browser zoom was disabled | Viewport metadata used `maximum-scale=1.0, user-scalable=no` | Removed the zoom restriction while preserving safe-area behavior |
| Five native screens used a separate pink-gray scaffold background | Hard-coded `0xFFF8F5F5` in login, parent academics/dashboard and teacher assessment/dashboard | Use `AppTheme.backgroundLight` consistently |

## Component inventory

“Aligned” means presentation changed in this review. “Retained” means no design change was needed in this pass, or a specialist/public/document treatment was preserved. Every listed component was included in the source inventory; runtime coverage is described separately below.

| Component | Review outcome |
| --- | --- |
| [Header.tsx](Frontend/smartshule/src/components/Header.tsx) | Aligned with shared theme / controls |
| [Sidebar.tsx](Frontend/smartshule/src/components/Sidebar.tsx) | Retained established / contextual styling |
| [auth/ChangePasswordPage.tsx](Frontend/smartshule/src/components/auth/ChangePasswordPage.tsx) | Retained established / contextual styling |
| [auth/LoginPage.tsx](Frontend/smartshule/src/components/auth/LoginPage.tsx) | Retained established / contextual styling |
| [common/CurriculumSuiteSwitcher.tsx](Frontend/smartshule/src/components/common/CurriculumSuiteSwitcher.tsx) | Aligned with shared theme / controls |
| [common/DailyAttendanceOverviewCard.tsx](Frontend/smartshule/src/components/common/DailyAttendanceOverviewCard.tsx) | Retained established / contextual styling |
| [common/DocumentSigningModal.tsx](Frontend/smartshule/src/components/common/DocumentSigningModal.tsx) | Retained established / contextual styling |
| [common/SchoolLocationMap.tsx](Frontend/smartshule/src/components/common/SchoolLocationMap.tsx) | Retained established / contextual styling |
| [common/TermClosingDateEditor.tsx](Frontend/smartshule/src/components/common/TermClosingDateEditor.tsx) | Aligned with shared theme / controls |
| [common/ViewLoadingSkeleton.tsx](Frontend/smartshule/src/components/common/ViewLoadingSkeleton.tsx) | Aligned with shared theme / controls |
| [curriculum/ClassCoverageSummary.tsx](Frontend/smartshule/src/components/curriculum/ClassCoverageSummary.tsx) | Aligned with shared theme / controls |
| [curriculum/LessonPlanDocument.tsx](Frontend/smartshule/src/components/curriculum/LessonPlanDocument.tsx) | Retained specialist document / print styling |
| [curriculum/TermCoveragePlanner.tsx](Frontend/smartshule/src/components/curriculum/TermCoveragePlanner.tsx) | Aligned with shared theme / controls |
| [landing/AdmissionsPage.tsx](Frontend/smartshule/src/components/landing/AdmissionsPage.tsx) | Retained established / contextual styling |
| [landing/ApplyAdmissionSlotPage.tsx](Frontend/smartshule/src/components/landing/ApplyAdmissionSlotPage.tsx) | Retained established / contextual styling |
| [landing/CloudSky.tsx](Frontend/smartshule/src/components/landing/CloudSky.tsx) | Retained established / contextual styling |
| [landing/FindUsPage.tsx](Frontend/smartshule/src/components/landing/FindUsPage.tsx) | Retained established / contextual styling |
| [landing/InteractiveLearningLab.tsx](Frontend/smartshule/src/components/landing/InteractiveLearningLab.tsx) | Retained established / contextual styling |
| [landing/LandingPage.tsx](Frontend/smartshule/src/components/landing/LandingPage.tsx) | Retained established / contextual styling |
| [landing/LearnerOnboardingPage.tsx](Frontend/smartshule/src/components/landing/LearnerOnboardingPage.tsx) | Retained established / contextual styling |
| [landing/ProgrammesPage.tsx](Frontend/smartshule/src/components/landing/ProgrammesPage.tsx) | Retained established / contextual styling |
| [legal/CookieBanner.tsx](Frontend/smartshule/src/components/legal/CookieBanner.tsx) | Retained established / contextual styling |
| [legal/LegalModal.tsx](Frontend/smartshule/src/components/legal/LegalModal.tsx) | Retained established / contextual styling |
| [modals/AcademicTermsModal.tsx](Frontend/smartshule/src/components/modals/AcademicTermsModal.tsx) | Aligned with shared theme / controls |
| [modals/AddBookModal.tsx](Frontend/smartshule/src/components/modals/AddBookModal.tsx) | Aligned with shared theme / controls |
| [modals/AddTimetableSlotModal.tsx](Frontend/smartshule/src/components/modals/AddTimetableSlotModal.tsx) | Retained established / contextual styling |
| [modals/AdminInitiateCreditUtilizationModal.tsx](Frontend/smartshule/src/components/modals/AdminInitiateCreditUtilizationModal.tsx) | Aligned with shared theme / controls |
| [modals/AdminReviewReversalModal.tsx](Frontend/smartshule/src/components/modals/AdminReviewReversalModal.tsx) | Aligned with shared theme / controls |
| [modals/AdmitLearnerModal.tsx](Frontend/smartshule/src/components/modals/AdmitLearnerModal.tsx) | Aligned with shared theme / controls |
| [modals/ArchivedStudentsModal.tsx](Frontend/smartshule/src/components/modals/ArchivedStudentsModal.tsx) | Retained established / contextual styling |
| [modals/BiometricDevicesModal.tsx](Frontend/smartshule/src/components/modals/BiometricDevicesModal.tsx) | Aligned with shared theme / controls |
| [modals/CBCFormativeModal.tsx](Frontend/smartshule/src/components/modals/CBCFormativeModal.tsx) | Retained established / contextual styling |
| [modals/ChangePasswordModal.tsx](Frontend/smartshule/src/components/modals/ChangePasswordModal.tsx) | Retained established / contextual styling |
| [modals/CreateFeeStructureModal.tsx](Frontend/smartshule/src/components/modals/CreateFeeStructureModal.tsx) | Aligned with shared theme / controls |
| [modals/CreateLessonPlanModal.tsx](Frontend/smartshule/src/components/modals/CreateLessonPlanModal.tsx) | Aligned with shared theme / controls |
| [modals/CreateLinkedRecordOfWorkModal.tsx](Frontend/smartshule/src/components/modals/CreateLinkedRecordOfWorkModal.tsx) | Aligned with shared theme / controls |
| [modals/CreateRecordOfWorkModal.tsx](Frontend/smartshule/src/components/modals/CreateRecordOfWorkModal.tsx) | Aligned with shared theme / controls |
| [modals/CreateSchemeModal.tsx](Frontend/smartshule/src/components/modals/CreateSchemeModal.tsx) | Retained established / contextual styling |
| [modals/EditRecordOfWorkModal.tsx](Frontend/smartshule/src/components/modals/EditRecordOfWorkModal.tsx) | Retained established / contextual styling |
| [modals/EditStudentModal.tsx](Frontend/smartshule/src/components/modals/EditStudentModal.tsx) | Retained established / contextual styling |
| [modals/EditTeacherProfileModal.tsx](Frontend/smartshule/src/components/modals/EditTeacherProfileModal.tsx) | Aligned with shared theme / controls |
| [modals/ExportReportModal.tsx](Frontend/smartshule/src/components/modals/ExportReportModal.tsx) | Retained specialist document / print styling |
| [modals/FeeCreditReceiptModal.tsx](Frontend/smartshule/src/components/modals/FeeCreditReceiptModal.tsx) | Retained specialist document / print styling |
| [modals/FeeStatementModal.tsx](Frontend/smartshule/src/components/modals/FeeStatementModal.tsx) | Retained specialist document / print styling |
| [modals/FinancialSegmentReportModal.tsx](Frontend/smartshule/src/components/modals/FinancialSegmentReportModal.tsx) | Aligned with shared theme / controls |
| [modals/ForwardPaymentModal.tsx](Frontend/smartshule/src/components/modals/ForwardPaymentModal.tsx) | Retained established / contextual styling |
| [modals/GenerateInvoicesModal.tsx](Frontend/smartshule/src/components/modals/GenerateInvoicesModal.tsx) | Retained established / contextual styling |
| [modals/InvoiceDetailsModal.tsx](Frontend/smartshule/src/components/modals/InvoiceDetailsModal.tsx) | Retained specialist document / print styling |
| [modals/IssueBookModal.tsx](Frontend/smartshule/src/components/modals/IssueBookModal.tsx) | Aligned with shared theme / controls |
| [modals/KnecSyncModal.tsx](Frontend/smartshule/src/components/modals/KnecSyncModal.tsx) | Retained established / contextual styling |
| [modals/LearnerProfileModal.tsx](Frontend/smartshule/src/components/modals/LearnerProfileModal.tsx) | Retained established / contextual styling |
| [modals/OnboardSchoolModal.tsx](Frontend/smartshule/src/components/modals/OnboardSchoolModal.tsx) | Aligned with shared theme / controls |
| [modals/OnboardTeacherModal.tsx](Frontend/smartshule/src/components/modals/OnboardTeacherModal.tsx) | Aligned with shared theme / controls |
| [modals/OnboardingApprovalsModal.tsx](Frontend/smartshule/src/components/modals/OnboardingApprovalsModal.tsx) | Retained established / contextual styling |
| [modals/ParentLinkingModal.tsx](Frontend/smartshule/src/components/modals/ParentLinkingModal.tsx) | Aligned with shared theme / controls |
| [modals/PromoteStudentModal.tsx](Frontend/smartshule/src/components/modals/PromoteStudentModal.tsx) | Retained established / contextual styling |
| [modals/ReceiptViewModal.tsx](Frontend/smartshule/src/components/modals/ReceiptViewModal.tsx) | Retained specialist document / print styling |
| [modals/RecordExpenseModal.tsx](Frontend/smartshule/src/components/modals/RecordExpenseModal.tsx) | Retained established / contextual styling |
| [modals/RecordIncomeModal.tsx](Frontend/smartshule/src/components/modals/RecordIncomeModal.tsx) | Retained established / contextual styling |
| [modals/RecordPaymentModal.tsx](Frontend/smartshule/src/components/modals/RecordPaymentModal.tsx) | Aligned with shared theme / controls |
| [modals/RequestTransactionReversalModal.tsx](Frontend/smartshule/src/components/modals/RequestTransactionReversalModal.tsx) | Aligned with shared theme / controls |
| [modals/ReturnBookModal.tsx](Frontend/smartshule/src/components/modals/ReturnBookModal.tsx) | Aligned with shared theme / controls |
| [modals/ReversalReceiptModal.tsx](Frontend/smartshule/src/components/modals/ReversalReceiptModal.tsx) | Retained specialist document / print styling |
| [modals/SendSmsModal.tsx](Frontend/smartshule/src/components/modals/SendSmsModal.tsx) | Retained established / contextual styling |
| [modals/StationeryRequirementsModal.tsx](Frontend/smartshule/src/components/modals/StationeryRequirementsModal.tsx) | Retained established / contextual styling |
| [modals/UploadMarksModal.tsx](Frontend/smartshule/src/components/modals/UploadMarksModal.tsx) | Retained established / contextual styling |
| [modals/ViewCurriculumTrackerModal.tsx](Frontend/smartshule/src/components/modals/ViewCurriculumTrackerModal.tsx) | Retained established / contextual styling |
| [modals/ViewDailyLogModal.tsx](Frontend/smartshule/src/components/modals/ViewDailyLogModal.tsx) | Retained established / contextual styling |
| [modals/ViewRecordOfWorkModal.tsx](Frontend/smartshule/src/components/modals/ViewRecordOfWorkModal.tsx) | Aligned with shared theme / controls |
| [modals/ViewSchemeModal.tsx](Frontend/smartshule/src/components/modals/ViewSchemeModal.tsx) | Retained established / contextual styling |
| [modals/ViewTrackerWeekModal.tsx](Frontend/smartshule/src/components/modals/ViewTrackerWeekModal.tsx) | Retained established / contextual styling |
| [modals/WholeTermSchoolReportModal.tsx](Frontend/smartshule/src/components/modals/WholeTermSchoolReportModal.tsx) | Retained specialist document / print styling |
| [views/AdminConsentManagementView.tsx](Frontend/smartshule/src/components/views/AdminConsentManagementView.tsx) | Aligned with shared theme / controls |
| [views/AdmissionsDashboardView.tsx](Frontend/smartshule/src/components/views/AdmissionsDashboardView.tsx) | Retained established / contextual styling |
| [views/AdmissionsEnrolmentHubView.tsx](Frontend/smartshule/src/components/views/AdmissionsEnrolmentHubView.tsx) | Aligned with shared theme / controls |
| [views/AnnouncementsView.tsx](Frontend/smartshule/src/components/views/AnnouncementsView.tsx) | Aligned with shared theme / controls |
| [views/AppSyllabusCoveragePlanView.tsx](Frontend/smartshule/src/components/views/AppSyllabusCoveragePlanView.tsx) | Aligned with shared theme / controls |
| [views/ArchivedRecordsView.tsx](Frontend/smartshule/src/components/views/ArchivedRecordsView.tsx) | Retained established / contextual styling |
| [views/ArrearsView.tsx](Frontend/smartshule/src/components/views/ArrearsView.tsx) | Retained established / contextual styling |
| [views/AssessmentsView.tsx](Frontend/smartshule/src/components/views/AssessmentsView.tsx) | Retained established / contextual styling |
| [views/AttendanceRegisterView.tsx](Frontend/smartshule/src/components/views/AttendanceRegisterView.tsx) | Retained established / contextual styling |
| [views/BursarDashboardView.tsx](Frontend/smartshule/src/components/views/BursarDashboardView.tsx) | Retained established / contextual styling |
| [views/CashFlowLedgerView.tsx](Frontend/smartshule/src/components/views/CashFlowLedgerView.tsx) | Retained established / contextual styling |
| [views/ClassesView.tsx](Frontend/smartshule/src/components/views/ClassesView.tsx) | Retained established / contextual styling |
| [views/ClinicManagementView.tsx](Frontend/smartshule/src/components/views/ClinicManagementView.tsx) | Aligned with shared theme / controls |
| [views/CompetencyAnalyticsView.tsx](Frontend/smartshule/src/components/views/CompetencyAnalyticsView.tsx) | Retained established / contextual styling |
| [views/ComplaintsView.tsx](Frontend/smartshule/src/components/views/ComplaintsView.tsx) | Retained established / contextual styling |
| [views/ConcernsView.tsx](Frontend/smartshule/src/components/views/ConcernsView.tsx) | Aligned with shared theme / controls |
| [views/CurriculumTrackerView.tsx](Frontend/smartshule/src/components/views/CurriculumTrackerView.tsx) | Aligned with shared theme / controls |
| [views/DashboardView.tsx](Frontend/smartshule/src/components/views/DashboardView.tsx) | Retained established / contextual styling |
| [views/DeputyDashboardView.tsx](Frontend/smartshule/src/components/views/DeputyDashboardView.tsx) | Retained established / contextual styling |
| [views/DisciplineClubsView.tsx](Frontend/smartshule/src/components/views/DisciplineClubsView.tsx) | Aligned with shared theme / controls |
| [views/DocumentSigningCenterView.tsx](Frontend/smartshule/src/components/views/DocumentSigningCenterView.tsx) | Retained established / contextual styling |
| [views/EDiaryView.tsx](Frontend/smartshule/src/components/views/EDiaryView.tsx) | Retained established / contextual styling |
| [views/ExpensesView.tsx](Frontend/smartshule/src/components/views/ExpensesView.tsx) | Retained established / contextual styling |
| [views/FacultyAttendanceRosterCard.tsx](Frontend/smartshule/src/components/views/FacultyAttendanceRosterCard.tsx) | Aligned with shared theme / controls |
| [views/FeeDeadlineBannerManagementView.tsx](Frontend/smartshule/src/components/views/FeeDeadlineBannerManagementView.tsx) | Retained established / contextual styling |
| [views/FeeStructureView.tsx](Frontend/smartshule/src/components/views/FeeStructureView.tsx) | Aligned with shared theme / controls |
| [views/FinancialReportsView.tsx](Frontend/smartshule/src/components/views/FinancialReportsView.tsx) | Retained specialist document / print styling |
| [views/FormativeAssessmentsView.tsx](Frontend/smartshule/src/components/views/FormativeAssessmentsView.tsx) | Retained established / contextual styling |
| [views/ForwardedPaymentsView.tsx](Frontend/smartshule/src/components/views/ForwardedPaymentsView.tsx) | Retained established / contextual styling |
| [views/GeofenceManagementSection.tsx](Frontend/smartshule/src/components/views/GeofenceManagementSection.tsx) | Retained established / contextual styling |
| [views/GeofenceView.tsx](Frontend/smartshule/src/components/views/GeofenceView.tsx) | Retained established / contextual styling |
| [views/HeadTeacherDashboardView.tsx](Frontend/smartshule/src/components/views/HeadTeacherDashboardView.tsx) | Aligned with shared theme / controls |
| [views/InventoryManagementView.tsx](Frontend/smartshule/src/components/views/InventoryManagementView.tsx) | Aligned with shared theme / controls |
| [views/InvoicesMpesaView.tsx](Frontend/smartshule/src/components/views/InvoicesMpesaView.tsx) | Retained established / contextual styling |
| [views/LearnerFeeCollectionDesk.tsx](Frontend/smartshule/src/components/views/LearnerFeeCollectionDesk.tsx) | Retained established / contextual styling |
| [views/LearningAreasView.tsx](Frontend/smartshule/src/components/views/LearningAreasView.tsx) | Aligned with shared theme / controls |
| [views/LibraryView.tsx](Frontend/smartshule/src/components/views/LibraryView.tsx) | Aligned with shared theme / controls |
| [views/LunchFeeManagementView.tsx](Frontend/smartshule/src/components/views/LunchFeeManagementView.tsx) | Retained established / contextual styling |
| [views/MasterBroadsheetView.tsx](Frontend/smartshule/src/components/views/MasterBroadsheetView.tsx) | Aligned with shared theme / controls |
| [views/MyDigitalSignatureView.tsx](Frontend/smartshule/src/components/views/MyDigitalSignatureView.tsx) | Aligned with shared theme / controls |
| [views/OccurrenceBookView.tsx](Frontend/smartshule/src/components/views/OccurrenceBookView.tsx) | Aligned with shared theme / controls |
| [views/OnboardQueueView.tsx](Frontend/smartshule/src/components/views/OnboardQueueView.tsx) | Retained established / contextual styling |
| [views/ParentConsentView.tsx](Frontend/smartshule/src/components/views/ParentConsentView.tsx) | Aligned with shared theme / controls |
| [views/ParentDashboardView.tsx](Frontend/smartshule/src/components/views/ParentDashboardView.tsx) | Retained established / contextual styling |
| [views/ParentProfileView.tsx](Frontend/smartshule/src/components/views/ParentProfileView.tsx) | Aligned with shared theme / controls |
| [views/PayrollManagementView.tsx](Frontend/smartshule/src/components/views/PayrollManagementView.tsx) | Aligned with shared theme / controls |
| [views/RecordsOfWorkView.tsx](Frontend/smartshule/src/components/views/RecordsOfWorkView.tsx) | Aligned with shared theme / controls |
| [views/ReportCardsView.tsx](Frontend/smartshule/src/components/views/ReportCardsView.tsx) | Retained specialist document / print styling |
| [views/SchemesView.tsx](Frontend/smartshule/src/components/views/SchemesView.tsx) | Retained established / contextual styling |
| [views/SlotApplicationsView.tsx](Frontend/smartshule/src/components/views/SlotApplicationsView.tsx) | Retained established / contextual styling |
| [views/SponsoredStudentsView.tsx](Frontend/smartshule/src/components/views/SponsoredStudentsView.tsx) | Retained established / contextual styling |
| [views/StandaloneArchivedRecordsPage.tsx](Frontend/smartshule/src/components/views/StandaloneArchivedRecordsPage.tsx) | Aligned with shared theme / controls |
| [views/StrandsView.tsx](Frontend/smartshule/src/components/views/StrandsView.tsx) | Retained established / contextual styling |
| [views/StudentFeeCheckerView.tsx](Frontend/smartshule/src/components/views/StudentFeeCheckerView.tsx) | Aligned with shared theme / controls |
| [views/StudentsView.tsx](Frontend/smartshule/src/components/views/StudentsView.tsx) | Retained established / contextual styling |
| [views/SummativeAssessmentsView.tsx](Frontend/smartshule/src/components/views/SummativeAssessmentsView.tsx) | Retained established / contextual styling |
| [views/SuperAdminDashboardView.tsx](Frontend/smartshule/src/components/views/SuperAdminDashboardView.tsx) | Retained established / contextual styling |
| [views/SyllabusCoveragePlanView.tsx](Frontend/smartshule/src/components/views/SyllabusCoveragePlanView.tsx) | Retained established / contextual styling |
| [views/SystemLogsView.tsx](Frontend/smartshule/src/components/views/SystemLogsView.tsx) | Retained established / contextual styling |
| [views/TeacherDashboardView.tsx](Frontend/smartshule/src/components/views/TeacherDashboardView.tsx) | Retained established / contextual styling |
| [views/TeacherGeofenceClockInCard.tsx](Frontend/smartshule/src/components/views/TeacherGeofenceClockInCard.tsx) | Retained established / contextual styling |
| [views/TeacherProfileView.tsx](Frontend/smartshule/src/components/views/TeacherProfileView.tsx) | Retained established / contextual styling |
| [views/TeacherSalaryAcknowledgementCard.tsx](Frontend/smartshule/src/components/views/TeacherSalaryAcknowledgementCard.tsx) | Retained established / contextual styling |
| [views/TeacherSalaryAcknowledgementView.tsx](Frontend/smartshule/src/components/views/TeacherSalaryAcknowledgementView.tsx) | Aligned with shared theme / controls |
| [views/TeachersView.tsx](Frontend/smartshule/src/components/views/TeachersView.tsx) | Retained established / contextual styling |
| [views/TimetableView.tsx](Frontend/smartshule/src/components/views/TimetableView.tsx) | Retained established / contextual styling |
| [views/TransactionReversalsView.tsx](Frontend/smartshule/src/components/views/TransactionReversalsView.tsx) | Aligned with shared theme / controls |
| [views/UserManagementView.tsx](Frontend/smartshule/src/components/views/UserManagementView.tsx) | Retained established / contextual styling |
| [views/VisualCBCView.tsx](Frontend/smartshule/src/components/views/VisualCBCView.tsx) | Retained established / contextual styling |
| [views/WebSyllabusCoveragePlanView.tsx](Frontend/smartshule/src/components/views/WebSyllabusCoveragePlanView.tsx) | Aligned with shared theme / controls |
| [views/WhatsAppBotView.tsx](Frontend/smartshule/src/components/views/WhatsAppBotView.tsx) | Retained established / contextual styling |

## Verification

- Frontend TypeScript: `./node_modules/.bin/tsc --noEmit --pretty false` in `Frontend/smartshule` passed; final `npm run lint` (which runs `tsc --noEmit`) also passed.
- Frontend production build: `npm run build -- --outDir /tmp/smartshule-interface-review/build-final` passed after removing the temporary preview harness. Existing mixed static/dynamic import and bundle-size warnings remain.
- Isolated browser review: local Vite preview, headless Chrome, synthetic fixtures and blocked non-preview requests. Forty-two screens/dialogs were rendered at 1440px and 390px (84 final viewport cases), with no final runtime errors or document-level horizontal overflow. Missing mock props were corrected before accepting the final results. This covers rendered fixture/empty states, not every populated, approval, failure or role state.
- Shared CSS browser assertions passed at both widths: wide modal sizing, white rounded paper, correct hover behavior, translucent backgrounds, maroon primary action, minimum 40px shared control height, disabled opacity and visible keyboard focus. Fine-pointer behavior was explicitly emulated for hover checks; width checks do not constitute testing on physical mobile hardware.
- A source comparison against the pre-review snapshot parsed TypeScript and excluded JSX `className` attributes and the three styling constants `input`, `button` and `primary`. All 52 changed TypeScript files had identical remaining syntax. This supports the conclusion that business code was preserved; it is not an end-to-end business workflow test.
- Native static analysis: `dart analyze lib` in `Mobile` reported only two pre-existing informational notices (`curly_braces_in_flow_control_structures`) in parent dashboard and teacher assessment.
- Native widget test: `/home/don/development/flutter/bin/flutter test --no-pub` in `Mobile` passed (one existing startup/portal-tabs test). The Flutter SDK required access to its external cache; dependency downloads were disabled with `--no-pub`.

Browser artifacts and the pre-review interface snapshot are under `/tmp/smartshule-interface-review`. The preview harness is temporary and removed after verification. External font/icon requests were blocked; review screenshots used a placeholder for Material Symbols. Typography/font loading, icon artwork, populated long-data states, physical devices, native screenshots, PDF pagination, and packaged APK/Electron execution were not exhaustively visually verified. Existing print/export business behavior was not changed or invoked against real records. No production backend, database, payment or messaging operation was used.

## Maintaining consistency

Use `primary` / `on-primary` for primary actions, `primary-container` for their hover state, `secondary` for secondary accents, `surface-container-lowest` for portal cards, `surface` for inset fields, `on-surface` / `on-surface-variant` for text and `outline-variant/30` for restrained borders. Reuse the shared field/button classes for new planning controls. Keep print paper explicitly white and preserve meaningful status and chart colors. Prefer explicit card classes over global selectors that infer component purpose from border radius or utility substrings.

The next useful visual check is a populated-data walkthrough with representative administrator, teacher, bursar and parent accounts in a disposable environment, particularly long learner names, many table columns, populated financial reports, curriculum histories and print layouts. Functional defects documented in `SMARTSHULE_CODEBASE_AUDIT.md` remain a separate workstream.

## Subsequent curriculum workflow change

The interface-only syntax comparison above describes that review snapshot. The later change separating coverage saving from weekly scheme creation intentionally changes application behavior; see [Saved syllabus coverage and weekly schemes](documentation/SYLLABUS_SCHEME_WORKFLOW.md) for its implementation and verification.
