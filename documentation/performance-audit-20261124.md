# Production performance audit — 24 November 2026

## Scope and evidence

Inspected the configured online Supabase PostgreSQL database using verified TLS and a read-only transaction. Read schema, indexes, aggregate table statistics, connection counts and `pg_stat_statements`; no student, guardian, staff or financial records were exported. Tested application reads inside a read-only transaction and compared returned data in memory.

The database was approximately 23 MB, with a 60-connection limit. At inspection, there were six idle connections and one active audit connection. These are a snapshot, not peak-load measurements. Application pool size remains 20; no compute upgrade, data deletion or region migration was performed.

The Render service is in Oregon and the configured Supabase pooler is in eu-west-1 (Ireland). Database round trips therefore matter even when individual SQL execution times are short. Historical statement statistics showed about 198,000 user-ID reads, 145,000 class-ID reads, and 32,600 school-payment list reads. These cumulative counts are not current requests per second. Report-card and summative-assessment reads were among the largest application contributors to cumulative SQL time.

## Changes

- Reuse identical ordinary PostgreSQL reads while producing one GET response. Concurrent authorization/use-case reads share the same query. Responses and user accounts never share this cache. Writes invalidate request snapshots, locks/functions bypass it, failures are evicted, snapshots are capped, and each caller receives isolated row data.
- Retry a transient dropped connection only for an ordinary table read. Never silently repeat a write whose commit outcome is uncertain.
- Build nine non-unique indexes concurrently, without blocking normal writes: case-insensitive email, normalized phone, report-card term/stream, lesson teacher/date and class/date and scheme-entry, scheme class/term and teacher/term, and payment school/date.
- Apply all declared lesson-plan filters in parameterized SQL. Existing use-case and transport authorization still run.
- Fetch guardian contacts for the selected learners, batch user lookups in learner/staff lists and staff inboxes, retain absent-contact results, and remove an unused fee-structure read.
- Process each broadsheet stream's assessment subset and use lookup maps for learning-area aliases and fallback matches, preserving score and ranking rules.
- Reduce sidebar payment polling from every five seconds to every 30 seconds; skip hidden tabs, prevent overlapping polls, and refresh when the tab becomes visible. Do not let an old account update current badges. Skip hidden-tab faculty roster polling too.
- Invalidate browser metadata cache and in-flight deduplication at save boundaries so older requests cannot repopulate the cache or intercept a new read. Bound cached metadata responses and include school metadata.

## Measurements and checks

A read-only online learner-list benchmark returned identical data for all 168 learners. The initial comparison reduced queries from 31 to 12 and elapsed time from 7.70 s to 2.91 s. This isolates the request-read reuse change; batching and missing-contact handling were also improved afterward. It is one controlled run from the development machine, not an authenticated HTTP load test from Render or a universal page-speed claim.

Regression coverage includes request/account isolation, write invalidation, dropped-connection write handling, SQL parameterization, learner profile access, parent ownership, eight role accounts, broadsheet rankings and aliases, messaging and frontend save/cache races. The role-account isolation fixture now explicitly links its synthetic parent to its synthetic learner rather than assuming a demo identity grants child access. The dual-role isolation fixture now uses synthetic identities, reserved example contacts and generated test passwords; its read-only assertion checks that stale reverse links are ignored without rewriting records.

Built-application Chrome scenarios cover teacher, administrator and parent dashboards, denied browser storage, recoverable and persistent module failures, and delayed font downloads. Production verification checks deployment status, health, entry page, asset delivery, public sign-in rendering and new index validity. No production login credentials are used in these checks.

## Limits

This release improves shared read paths and measured bottlenecks across modules. It does not establish performance guarantees for every workflow, large exports or peak concurrent users. The Render Free instance can still spin down after idle periods; eliminating that delay requires a hosting change. Database region alignment is a separate infrastructure decision. Future measurements should distinguish database execution, network round trips, response size and browser rendering before further changes.

Current platform reference: [Render Free instance behavior](https://render.com/docs/free#spinning-down-on-idle).
