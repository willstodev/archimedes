# Database Architecture

PostgreSQL is the operational source of truth. JSON, CSV, Markdown, and Google Sheets are import/export or report formats only.

The initial schema is defined in [schema.ts](../../src/infrastructure/database/schema.ts) and [0000_initial.sql](../../drizzle/0000_initial.sql). Schema changes require migrations and should preserve:

- `timestamptz` timestamps stored in UTC.
- Foreign keys for ownership and lifecycle invariants.
- Unique indexes for strong identities and idempotent upserts.
- Raw provider payloads separated from normalized columns.
- Token and cost accounting for optional LLM work.

Do not use runtime auto-sync or destructive schema push in normal operation.
