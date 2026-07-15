# Source Architecture

Source adapters fetch and map external data only. They must not contain scoring, application tracking, or outreach rules.

Preferred job discovery order:

1. Known company career or ATS endpoints.
2. Greenhouse.
3. Lever.
4. Ashby.
5. Workable.
6. Official static career pages.
7. Browser rendering only when required.
8. Broad web discovery only to find authoritative source URLs.

Adapters should support bounded concurrency, timeouts, transient retry with jitter, per-host rate limits, checkpointing where possible, conditional requests, Zod validation, and fixture-based contract tests.
