# Grace Seeds School web interface standards

Implemented locally on 17 November 2026 against baseline `e06bd59f745e98dfb87cbfdb54eb44ceef49fda0`. These changes are not deployed. Existing local feature work was preserved; production data, permissions and school settings were not changed.

## Shared visual rules

| Purpose | Standard |
| --- | --- |
| Main actions and selected controls | Maroon `primary` (`#7a1228`), white text; darker `primary-container` (`#5c0a1a`) for emphasis/hover |
| Tonal actions, neutral information and decorative icons | Pale maroon brand tokens with dark maroon text |
| Page background | Mild grey `surface` (`#f3f5f8`) / `background` (`#f1f3f7`) |
| Cards and dialogs | Mild grey `surface-container-lowest` (`#eaedf4`), shared neutral borders and shadows |
| Form fields | Lighter grey `surface`, common border/focus styling; shared fields and buttons have a 44px minimum height |
| Checkbox, radio and range controls | Maroon accent; visible maroon keyboard focus |
| Successful/paid/connected/approved states | Explicit semantic success colours, independent of action styling |
| Pending/warning states | Semantic amber/warning colours |
| Errors, rejection and destructive actions | Red/error colours |
| Charts, grading levels and learning illustrations | Preserve meaningful data palettes and their matching legends |
| Institutional/public branding | Maroon and existing school gold accents; third-party logos/images retain their actual colours |

Use `ui-button`, `ui-button-primary`, `ui-button-danger` and `ui-field` for new forms. Do not introduce blue, green, purple or teal action palettes for individual modules. Status badges and data visualizations may use other colours when the label and underlying state/data justify them. Pair colour with readable text or icons.

The former teal/brown `secondary` and `tertiary` usages mixed branding with status/data. The shared theme now uses coordinated brand/neutral variants for those accent slots. Existing meaningful teal/brown data colours were moved to explicit `success` / `warning` token families with their original values retained. This prevents a brand change from silently recolouring achievement charts or success indicators.

## Changes and inspection coverage

- Reviewed **158 TSX files** and applied styling changes to **133** of them, plus the shared stylesheet. Coverage includes the application shell, role dashboards, learner/staff management, curriculum/planning, assessments, finance/payments, payroll, inventory, concerns, legal/account screens and their dialogs.
- Standardized coloured headers, action buttons, selected controls, focus accents, decorative icons and neutral surfaces. Replaced the green payment-action override and selected dark faculty controls found during browser review.
- Preserved status dots, term-ending warnings, grading styles, chart bars and colour swatches. Source inspection distinguishes data colours from decorative interface accents.
- The dedicated packaged syllabus view and the educational Learning Lab/sky artwork were excluded from the general colour migration. Their content is not a separate school-administration theme. No Flutter, Android, Electron configuration or native package was edited or built.
- No business text, API identifier, state transition, permission predicate, save handler or data calculation was changed by this styling pass.

The shared stylesheet is `Frontend/smartshule/src/index.css`. Review/apply tooling is [`scripts/interface/standardize-web-theme.cjs`](../scripts/interface/standardize-web-theme.cjs). Its default mode reports prospective changes without writing source. `--write` applies the scoped colour migration. `--verify-before` compares current TSX against the private pre-style snapshots, normalizing only colour utilities; identifiers, expressions, markup structure, event handlers and non-styling literals must match.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint --prefix Frontend/smartshule` | Passed (`tsc --noEmit`). |
| `env -i PATH="$PATH" npm run build --prefix Frontend/smartshule -- --outDir /tmp/smartshule-interface-consistency-20261117/web-dist` | Passed. Existing bundle-size/import warnings remain. |
| `node scripts/interface/standardize-web-theme.cjs --verify-before` | All **133** changed TSX files preserve their non-styling AST; no further migration edits remain. |
| `git diff --check` | Passed. |
| Shared theme contrast | Six text/background pairs passed 4.5:1: primary 10.80, primary-container 13.88, pale-brand 14.61, card text 17.85, secondary body text 7.03 and semantic success 6.48. This is not a full WCAG certification of every data state. |
| Browser inspection | **28 checks**, covering **27 screen states**, seven roles, the expense dialog and a 390px viewport. No JavaScript exceptions or page-level horizontal overflow in inspected states. The final action-colour scan found no unexpected blue/green action fills on these screens. |

Browser coverage included super-admin/admin, headteacher, deputy headteacher, accountant, teacher and guardian dashboards; calendar, coverage, schemes, lessons, work records, learners, staff, summative assessments, fee structures, invoices/payments, expenses, financial reports, payroll, inventory, concerns, user management and teacher timetables. Runtime coverage is a representative sample, not a claim to have opened every hidden dialog or data-dependent state.

The review used a disposable in-memory school and localhost-only API/web previews. Official Material Symbols were cached for icon rendering; other remote resources were blocked. Body-font hosting and production delivery were not verified. The disposable preview reset its own in-memory rate-limit counters to support repeated UI inspection; production rate-limit settings were untouched. No payments, messages, data imports, migrations or production writes were performed.

Pre-style source copies, colour contrast results, role screenshots, browser receipts and build/type-check logs are under `/tmp/smartshule-interface-consistency-20261117/`. Initial review attempts exposed harness/module-format/navigation issues and an expired local preview process; the final isolated-role run completed successfully. These were local verification limitations, not production workflow failures.

Release the reviewed web changes through the normal deployment process before treating this interface as live. The school's operational-year/calendar decisions and previously documented database findings remain separate from this styling work.

## Requested surface and AE correction

Following the user's screenshot review on 17 November, the shared card/surface stack was restored to its earlier mild-grey palette rather than white. Hard-coded white interface containers and fields were moved to the same surface tokens across 79 component files (531 class attributes). Print-specific white utilities, document components, small image frames and header action contrast were preserved. This supersedes the initial white-card design described in the original inspection receipt.

The dashboard's Approaching Expectations (AE) chart segment and swatch now use amber-700; the percentage uses amber-800, replacing a very pale background-container colour that had been incorrectly used for text/graphics. Data and percentages are unchanged. The AE segment/swatch contrast against the card is **4.28:1**, percentage text against its row is **5.56:1**, and primary body text against the restored card is **15.23:1**. The original browser receipt documents the previous surfaces; this follow-up was verified with source inspection, contrast checks, frontend TypeScript and the web build. It remains local and is not deployed.
