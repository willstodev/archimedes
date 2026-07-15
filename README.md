# Archimedes

Archimedes is a local-first career intelligence system for discovering, normalizing, deduplicating, scoring, and tracking high-value international software engineering opportunities and relevant technical recruiters.

The project is designed around a configurable senior backend/full-stack search profile: TypeScript, Node.js, NestJS, Angular, AWS, distributed systems, APIs, and cloud-native work, especially remote-friendly international opportunities.

Archimedes supports human decisions. It must not submit applications, send messages, connect with recruiters, or mutate third-party systems without explicit user confirmation.

## Status

This repository is in early implementation.

Currently present:

- TypeScript project scaffold with strict mode.
- PostgreSQL Docker Compose service.
- Drizzle schema and initial migration.
- Environment validation.
- Pino logger setup.
- URL and text normalization helpers.
- Deterministic job scoring helper.
- Unit tests for normalization and scoring.
- CLI command surface matching the intended workflows.

Not implemented yet:

- Live ATS or career-page crawling.
- Legacy import logic.
- Job and recruiter search workflows.
- Application and outreach state update services.
- Reports and token diagnostics.

The CLI lists the intended commands, but most workflow commands currently return "not implemented yet" until their module services are built.

## Principles

Archimedes optimizes for:

1. eligibility and opportunity quality;
2. correctness and deduplication;
3. low LLM token usage;
4. low network and browser usage;
5. maintainability;
6. throughput.

PostgreSQL is the operational source of truth. JSON, CSV, Markdown, and Google Sheets are import/export or report formats only, not live state stores.

LLMs are an exception layer for ambiguous, high-potential candidates. They are not used as crawlers, databases, deduplicators, or primary classifiers.

## Architecture

The intended shape is a modular monolith:

```text
src/
  cli/                  # user-facing commands; no business logic
  modules/              # domain/application modules
  sources/              # ATS, career page, and public discovery adapters
  infrastructure/       # database, HTTP, browser, LLM, logging
  shared/               # config, schemas, normalization
```

Current implemented files are concentrated in:

- `src/cli/index.ts`
- `src/infrastructure/database/`
- `src/infrastructure/logging/`
- `src/modules/scoring/`
- `src/shared/config/`
- `src/shared/normalization/`

Business rules should live in domain modules, not CLI handlers, database schema files, migrations, or source adapters.

## Requirements

- Node.js 22 or newer
- pnpm 10
- Docker and Docker Compose
- PostgreSQL through the included Compose service

## Setup

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` and set a real local `POSTGRES_PASSWORD`. Keep `DATABASE_URL` aligned with that password:

```dotenv
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgres://applies:change-me@127.0.0.1:5432/archimedes
LOG_LEVEL=info
```

Start PostgreSQL:

```bash
pnpm db:up
```

Run migrations:

```bash
pnpm db:migrate
```

## Commands

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Database:

```bash
pnpm db:up
pnpm db:down
pnpm db:migrate
pnpm db:generate
```

CLI help:

```bash
pnpm cli -- --help
```

Planned workflow commands:

```bash
pnpm import:legacy -- --help
pnpm sources:sync -- --help
pnpm search:jobs -- --help
pnpm search:recruiters -- --help
pnpm jobs:list -- --help
pnpm applications:update -- --help
pnpm outreach:update -- --help
pnpm report:daily -- --help
pnpm tokens:report -- --help
```

These workflow commands are part of the contract but are not fully implemented yet.

## Database

The Compose database is intentionally local-only:

- image: `postgres:17-alpine`
- bound to `127.0.0.1:5432`
- database: `archimedes`
- user: `applies`
- named volume: `postgres_data`
- healthcheck: `pg_isready -U applies -d archimedes`
- restart policy: `always`

The initial schema includes tables for:

- companies
- job sources
- jobs
- job snapshots
- job evaluations
- recruiters
- recruiter sources
- applications
- application events
- outreach
- search runs
- search run items
- LLM cache

Schema changes should be made through Drizzle migrations. Do not use destructive schema push as a normal development workflow.

## Scoring Model

The deterministic job scorer uses a 0-100 score:

- stack fit: 30
- remote/location eligibility: 25
- seniority fit: 15
- company/product quality: 10
- compensation potential: 10
- application friction: 10

Verdicts:

- `strong_apply`: 85-100
- `apply`: 75-84
- `maybe`: 60-74
- `skip`: below 60

Hard-skip reason codes force a `skip` verdict with total score `0`.

## Safety Boundaries

Archimedes must not:

- automatically apply to jobs;
- automatically send recruiter messages;
- authenticate to LinkedIn through automation;
- scrape private or login-gated LinkedIn pages;
- bypass CAPTCHA, rate limits, robots controls, or access restrictions;
- store credentials, cookies, session storage, LinkedIn data exports, or private resume data;
- use Google Sheets, Markdown, or JSON as operational state;
- silently exceed configured LLM token or cost budgets.

Application and outreach mutations require explicit user confirmation before state can be marked as submitted or sent.

## Public Repository Safety

This repository is intended to contain application code, schema, migrations, tests, and generic documentation only. Keep local operational data out of Git:

- `.env` files with real credentials;
- resumes, cover letters, recruiter messages, and generated reports;
- imported Google Sheets, CSV, JSON, or Markdown tracker data;
- browser profiles, cookies, session storage, and LinkedIn exports;
- database dumps and local backups.

Use `.env.example` only for safe placeholders. Before publishing a fork or repository snapshot, run a secret and personal-data scan across both the working tree and Git history.

## Testing

Run the current test suite:

```bash
pnpm test
```

Run type checking:

```bash
pnpm typecheck
```

Before declaring larger work complete, use the relevant subset first, then the broader local gate when warranted:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:migrate
```

Only report checks that were actually run.
