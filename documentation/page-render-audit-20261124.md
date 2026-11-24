# Portal page rendering checks — 24 November 2026

## Fixed failures

- Payment form: `useMemo` ran only when the form was open, changing React's hook order when a mounted form opened or closed. All hooks now run before the closed-form return.
- Curriculum tracker details: four state hooks ran only when a tracker was selected. They now run before the no-selection return.
- Receipt handling: printer preference reads/writes now use the storage-safe adapter. Private browsers and embedded webviews can continue without persistent storage.
- Finance navigation: the permitted `capitation-income` alias now renders financial reports rather than an empty content area.
- Page navigation: the suspense boundary now follows the selected page, showing loading feedback while switching modules.

## Page-by-page evidence

[CSV of individual results](page-render-audit-20261124.csv): 223 successful navigation/return checks, comprising 59 regular admin pages, 29 teacher pages, 11 parent pages, 59 mobile admin pages with storage denied, 59 admin pages during temporary API failures, and six archive/open-return checks.

Six additional dashboards rendered for head teacher, deputy, admissions, bursar, accountant and student roles. Payment and tracker forms passed 16 repeated open/close checks across normal and denied storage. Eight session/cache tests and four runtime recovery tests passed, along with the frontend type check and production build.

These are headless Chrome checks against a production frontend build with synthetic API responses, including empty records and explicit outages. They check nonempty content, caught rendering failures and unhandled browser errors. They do not claim that every data-dependent workflow or physical Safari/Android device was tested. No production credentials or learner records are included.

## Reproduce

From `Frontend/smartshule`, run `npm run build` then `npm run test:pages`. The browser suite requires Google Chrome (default `/usr/bin/google-chrome`, or set `CHROME_BINARY`). It serves only local fixtures and traverses the actual navigation. Test output records each page and role. The modal fixture uses the actual payment and tracker components.
