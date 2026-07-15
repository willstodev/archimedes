# Archimedes — Engineering Constitution

Archimedes is a local-first career intelligence system: a leverage engine for finding high-value international jobs and the right technical recruiters with minimal wasted effort, network calls and LLM tokens.

## Mission

Build and maintain a local-first system that discovers, normalizes, deduplicates, ranks and tracks:

1. high-value software engineering jobs for the configured target profile;
2. relevant LinkedIn recruiter profiles connected to target companies or international engineering hiring.

The system supports human decisions. It must never submit applications, send LinkedIn messages, connect with people or mutate third-party systems without explicit user confirmation.

Primary optimization order:

1. eligibility and opportunity quality;
2. correctness and deduplication;
3. low token consumption;
4. low network and browser usage;
5. maintainability;
6. throughput.

Do not optimize for raw lead volume. Ten weak jobs are worse than three strong jobs.

## Product boundaries

This repository is exclusively for job and recruiter discovery, evaluation and tracking.

In scope:

- collecting jobs from official career pages and trusted ATS sources;
- collecting public LinkedIn recruiter profile URLs through compliant discovery methods;
- deterministic filtering and scoring;
- optional LLM evaluation of ambiguous, high-potential candidates;
- local application and outreach tracking;
- reports derived from PostgreSQL;
- importing the legacy Google Sheets/JSON state once or on explicit demand.

Out of scope:

- calendar, email, routine, finance, health or general personal-assistant workflows;
- automatic job applications;
- automatic LinkedIn login, connection requests, DMs or profile interaction;
- CAPTCHA bypassing, proxy rotation, stealth automation or access-control circumvention;
- treating Google Sheets, Markdown or JSON files as operational databases;
- deployment to cloud or third-party runtime environments;
- microservices, Kubernetes, Elasticsearch or distributed infrastructure.

## Execution environment

The application runs only on the user's machine.

- Runtime: current Node.js LTS with TypeScript in strict mode.
- Package manager: `pnpm` with a committed lockfile.
- Application processes run on the host during development.
- PostgreSQL runs through Docker Compose.
- PostgreSQL data must use a named Docker volume.
- The database service must use `restart: always` as explicitly required by the owner.
- Bind PostgreSQL to `127.0.0.1`, never to every network interface.
- Include a database healthcheck and make dependent services wait for health where applicable.
- Credentials belong in `.env`, with safe placeholders in `.env.example`.
- Never commit credentials, cookies, session storage, LinkedIn data exports or resume-private data.

Minimum Compose database contract:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: always
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_DB: archimedes
      POSTGRES_USER: applies
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U applies -d archimedes"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

Do not blindly regenerate this file if an equivalent secure configuration already exists.

## Target architecture

Use a modular monolith with explicit boundaries:

```text
src/
  cli/                  # user-facing commands; no business logic
  modules/
    companies/
    jobs/
    recruiters/
    applications/
    outreach/
    searches/
    scoring/
  sources/
    ats/
      greenhouse/
      lever/
      ashby/
      workable/
    careers/
    linkedin-discovery/
  infrastructure/
    database/
    http/
    browser/
    llm/
    logging/
  shared/
    config/
    schemas/
    normalization/
```

Dependency direction:

- CLI and source adapters call application/domain services.
- Domain modules do not import CLI, browser, database or provider implementations.
- Infrastructure implements interfaces owned by the consuming module.
- Source adapters only fetch and map source data. They contain no scoring or application-tracking rules.
- Cross-module access goes through exported services, never internal files.
- Circular dependencies are forbidden.

Start as one process and one database. Introduce a persistent job queue only after measured concurrency or retry requirements justify it. Do not add Redis by default; a PostgreSQL-backed queue or scheduled CLI is sufficient for the first consolidated version.

## Preferred libraries

Use the smallest stable set that satisfies the requirement:

- `drizzle-orm` and `drizzle-kit` for PostgreSQL and migrations;
- `pg` as the driver;
- `zod` for configuration, external payload and structured-output validation;
- native `fetch`/Undici for HTTP;
- `cheerio` for static HTML parsing;
- `playwright` only when an HTTP/API/static path cannot provide the required public data;
- `pino` for structured logs;
- `vitest` for tests.

Do not add Fastify or another HTTP server until a real UI or external API is requested. Prefer a typed CLI for local operation.

Before adding a dependency, state which existing capability cannot reasonably solve the need. Avoid wrapper libraries around trivial platform APIs.

## PostgreSQL is the source of truth

All mutable operational state lives in PostgreSQL. JSON, CSV and Markdown are import/export or report formats only.

Minimum model:

- `companies`: normalized company identity, careers URL, domain, remote classification and priority tier;
- `job_sources`: source type, source identifier, URL, cursor/checkpoint and crawl policy;
- `jobs`: canonical normalized job record and current lifecycle state;
- `job_snapshots`: append-only raw/source snapshots keyed by content hash;
- `job_evaluations`: deterministic and optional LLM evaluation, including ruleset/model version;
- `recruiters`: normalized public recruiter identity, LinkedIn URL, title, company and relevance signals;
- `recruiter_sources`: discovery provenance and last verification time;
- `applications`: user-confirmed application state;
- `application_events`: append-only status history;
- `outreach`: recruiter contact state; `sent` only after user confirmation;
- `search_runs`: run configuration, counters, timing, errors and token/cost metrics;
- `search_run_items`: candidates considered and their disposition;
- `llm_cache`: input hash, schema version, model, result and expiration policy.

Requirements:

- UUID or identity columns are generated by the database/application consistently.
- Use `timestamptz` and store UTC.
- Every schema change requires a committed migration.
- Never use runtime auto-sync or destructive schema push in normal operation.
- Use foreign keys, check constraints and unique indexes for invariants.
- Use JSONB only for raw provider payloads and genuinely variable metadata, not as a substitute for schema design.
- Keep raw payloads separate from normalized columns.
- Record source provenance and `first_seen_at`, `last_seen_at`, `last_verified_at` where relevant.
- Use transactions for multi-table state changes.
- Reports query the database; they do not create a parallel state machine.

## Identity and deduplication

Deduplication must happen before browser use and before LLM evaluation.

Canonical URL normalization must:

- trim whitespace;
- force lowercase hostname;
- remove fragments;
- remove known tracking parameters such as `utm_*`, `trk`, `trackingId`, `ref` when they are not part of identity;
- normalize trailing slashes;
- preserve parameters required to identify a job;
- canonicalize known ATS URL variants.

Job identity precedence:

1. source provider plus stable external job ID;
2. canonical application URL;
3. normalized company plus normalized role plus compatible location fingerprint.

Recruiter identity precedence:

1. canonical LinkedIn profile URL;
2. source-specific stable ID, when publicly available and lawful to store;
3. normalized full name plus current company, flagged as a probable rather than certain match.

Enforce strong identities with unique indexes and use atomic upserts. Application-only checks are insufficient.

## Job discovery strategy

Prefer structured, cheap and authoritative sources in this order:

1. known company career/ATS endpoints;
2. Greenhouse;
3. Lever;
4. Ashby;
5. Workable;
6. official career pages using static HTTP;
7. browser rendering only when required;
8. broad web discovery only to find authoritative source URLs.

Discovery and enrichment are separate phases. A discovery run should first collect compact candidate metadata. Fetch the full description only after local dedupe and cheap filters pass.

Each source adapter must support:

- bounded concurrency;
- timeout and abort signal;
- retry only for transient failures, with exponential backoff and jitter;
- per-host rate limiting;
- checkpoint/incremental crawling when the source permits it;
- conditional requests using ETag or Last-Modified when available;
- deterministic parsing validated by Zod;
- a fixture-based contract test;
- clear classification of permanent versus retryable failures.

Never retry 4xx errors blindly. Never launch an unbounded `Promise.all`.

## Recruiter and LinkedIn discovery

The objective is to identify relevant public recruiter profiles, not to automate LinkedIn activity.

Prioritize recruiters:

- employed by companies with a selected or high-scoring job;
- titled Technical Recruiter, Engineering Recruiter, Talent Acquisition, Technical Sourcer or equivalent;
- showing evidence of software-engineering hiring;
- connected to the configured target geography, remote, international or global hiring.

Discovery may use public search-engine results, company team pages, job posts naming recruiters and user-provided LinkedIn URLs. Store only the minimum professional data needed for dedupe and outreach decisions.

Do not:

- authenticate to LinkedIn through automation;
- scrape private or login-gated pages;
- persist session cookies;
- bypass rate limits, robots controls, CAPTCHA or access restrictions;
- auto-send invitations or messages;
- infer sensitive personal attributes.

When LinkedIn blocks direct retrieval, preserve the public profile URL and available search snippet, mark verification status accurately and continue. Do not fabricate missing data.

Recruiter scoring must be deterministic first. Suggested weights:

- target company with an eligible open job: 35;
- technical/engineering recruiting role: 25;
- target-geography/international hiring signal: 20;
- role/stack relevance: 10;
- profile identity confidence: 10.

Only prepare an outreach draft for profiles above the configured threshold. Mark it `pending`; mark `sent` only after explicit user confirmation.

## Job eligibility and scoring

Apply hard filters before scoring.

Hard skip:

- US-only, SSN-only, security clearance or incompatible work authorization;
- onsite/hybrid outside an acceptable location;
- internship or junior roles;
- heavy staff/principal/leadership roles requiring clearly incompatible experience;
- primary stack materially outside the target;
- React-only without strong backend, Node.js, Angular or AWS relevance;
- clearly sub-floor compensation;
- broken, removed or duplicate job;
- paid or high-friction low-ROI portal;
- body shop or opaque outsourcing with no credible upside.

Target profile:

- 5+ years of software development;
- TypeScript, Node.js, NestJS, Angular and AWS;
- backend or full stack;
- distributed systems, event-driven architecture, APIs and cloud-native systems;
- remote-friendly international roles compatible with the configured target geography;
- compensation above the configured local floor.

Deterministic job score, 0–100:

- stack fit: 30;
- remote/location eligibility: 25;
- seniority fit: 15;
- company/product quality: 10;
- compensation potential: 10;
- application friction: 10.

Verdicts:

- 85–100: `strong_apply`;
- 75–84: `apply`;
- 60–74: `maybe`;
- below 60: `skip`.

Store component scores and reason codes, not only the total. Scoring rules must be versioned so existing jobs can be re-evaluated without crawling again.

## Token economy is a hard requirement

LLMs are an exception layer, never the crawler, database, deduplicator or primary classifier.

Mandatory decision pipeline:

1. query PostgreSQL for known identity and freshness;
2. apply deterministic normalization and hard filters;
3. compute deterministic features and preliminary score;
4. discard or accept obvious cases without LLM usage;
5. invoke an LLM only for ambiguous candidates whose potential value exceeds the configured threshold;
6. validate structured output and cache it by content hash plus prompt/ruleset/model version.

Rules:

- Never send the entire repository, `AGENTS.md`, resume PDF or search history to a model.
- Build a minimal job/recruiter DTO containing only decision-relevant fields.
- Strip navigation, cookie banners, repeated boilerplate and unrelated legal text before any LLM call.
- Hard-cap description and context lengths; prefer deterministic extraction of relevant sections.
- Use structured JSON output with a small schema. Do not request essays.
- Batch only homogeneous evaluations when batching reduces overhead without harming traceability.
- Do not ask an LLM to calculate deterministic scores, normalize URLs, detect exact duplicates or format reports.
- Cache successful evaluations. Identical normalized content under the same evaluation version must produce zero new LLM calls.
- Re-evaluate only when normalized content, ruleset, prompt schema or chosen model changes.
- Record input tokens, output tokens, latency, cache hit and estimated cost for every call.
- Enforce configurable per-run and per-day token/cost budgets. Stop optional evaluation when the budget is reached; never silently exceed it.
- Prefer the smallest capable model for classification. Escalate a single ambiguous item, not the whole batch.
- Never use MCP calls as a loop-level database operation.

Default LLM result schema should remain compact:

```ts
type AmbiguousEvaluation = {
  eligibility: "eligible" | "ineligible" | "uncertain";
  reasonCodes: string[];
  stackSignals: string[];
  locationSignals: string[];
  redFlags: string[];
  confidence: number;
};
```

## Google and MCP policy

PostgreSQL replaces Google Sheets as the operational source of truth.

- Do not read Google Sheets before each search.
- Do not call Google Drive/Sheets once per job, recruiter or state transition.
- Do not use an MCP server for dedupe, pagination state, counters or ordinary CRUD.
- Google integration is an explicit boundary command only: `import-legacy` or an optional user-requested export.
- Import must be idempotent, resumable and record its source plus imported row identity.
- After migration is verified, normal `/search`, `/jobs`, `/recruiters`, `/apply` and `/outreach` flows must work with Google unavailable.
- Calendar, Gmail and Outlook do not belong in this repository.

If a third-party connector is required for a one-time operation, fetch the minimum range/data once, persist normalized records locally and continue locally.

## CLI contract

Prefer explicit, composable commands. Exact syntax may evolve, but responsibilities must remain separated:

```text
pnpm db:up
pnpm db:down
pnpm db:migrate
pnpm db:backup
pnpm db:restore -- <file>
pnpm import:legacy -- <csv-or-json>
pnpm sources:sync
pnpm search:jobs -- --limit 10 --mode quality
pnpm search:recruiters -- --limit 5 --company <company>
pnpm jobs:list -- --verdict strong_apply
pnpm applications:update -- --job <id> --status applied
pnpm outreach:update -- --recruiter <id> --status sent
pnpm report:daily
pnpm tokens:report
```

Commands must:

- support `--help`;
- validate input before doing work;
- provide a dry-run option for imports and bulk mutations;
- return non-zero exit codes on failure;
- print compact summaries by default and detailed logs only with `--verbose`;
- avoid prompts in automation-safe/read-only commands;
- require confirmation or an explicit flag for destructive operations.

## Observability and performance

Every search run records:

- source counts;
- fetched, unchanged, deduplicated, filtered, evaluated and accepted counts;
- HTTP/browser/LLM call counts;
- cache-hit rates;
- duration per phase;
- retry and failure counts;
- token usage and estimated cost.

Use structured Pino logs. Never log secrets, cookies, full resumes, private messages or unnecessary personal data.

Performance rules:

- measure before optimizing;
- use indexes verified against real query patterns;
- select only required columns;
- paginate large reads;
- use bounded concurrency configured per host;
- use content hashes to avoid reparsing unchanged records;
- prefer incremental sync over full recrawls;
- browser pages are pooled with a strict low concurrency limit and always closed in `finally`;
- database writes are batched or transactionally upserted where appropriate.

## Testing and quality gates

Required test layers:

- unit tests for URL/text normalization, hard filters and score components;
- fixture/contract tests for every ATS and careers adapter;
- repository integration tests against PostgreSQL;
- migration test from an empty database;
- idempotency tests for crawling and legacy import;
- token-budget and LLM-cache tests using a fake provider;
- one local smoke test covering source fixture → normalize → dedupe → score → persist → report.

No test may depend on live LinkedIn, live ATS pages, Google MCP or a paid LLM. Live-source checks are separate opt-in diagnostics.

Before declaring work complete, run the narrowest relevant checks, then the full local gate when risk warrants it:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm db:migrate
```

Do not claim success if a check was not run. Report what was and was not verified.

## Legacy migration plan

The current V1 contains useful data but the architecture must not be preserved blindly.

Known V1 debts to remove:

- oversized `AGENTS.md` mixing job search, DMs, Sheets, calendar, routine, email and personal operations;
- Google Sheets as remote transactional storage;
- mandatory tracker refresh before searches;
- mutable state split between Sheets, JSON registries and Markdown reports;
- duplicated rules across `AGENTS.md` and prompt files;
- synchronous scripts without a typed domain or database constraints;
- Markdown status blocks acting as workflow state;
- repeated generation of cover letters and verbose reports before the user needs them.

Migration order:

1. inventory legacy JSON/CSV/Markdown and map fields without mutating them;
2. create PostgreSQL schema and migrations;
3. implement deterministic normalization and identity functions with regression fixtures from V1;
4. build an idempotent importer with dry-run and reconciliation counts;
5. import applications, avoided jobs, recruiters/outreach and relevant company sources;
6. compare counts, duplicates and statuses; write a reconciliation report;
7. switch reads to PostgreSQL;
8. switch writes to PostgreSQL;
9. retain legacy files read-only for a defined rollback window;
10. remove Google from the normal execution path only after verification.

Never delete or overwrite V1 data during migration. Never mark an application or DM as sent based only on generated Markdown.

## Documentation strategy

Keep this root file stable and compact. It is the constitution, not the full manual.

Put detailed, task-specific rules in focused files and read only the relevant ones:

```text
docs/domain/profile.md
docs/domain/job-rules.md
docs/domain/recruiter-rules.md
docs/architecture/database.md
docs/architecture/sources.md
docs/architecture/token-budget.md
docs/migrations/v1.md
```

Do not duplicate the same rule across files. Link to the canonical rule. Generated reports belong outside instruction files and should be excluded from default agent context.

## Future Codex skill

Create an operational skill named `operate-archimedes` only after the database, CLI contracts and main workflows have been implemented, tested and used successfully in real local runs. Do not scaffold the skill during initial architecture work.

The skill is an interface for operating a stable Archimedes CLI. It is not a substitute for application code, domain documentation or this engineering constitution.

Expected triggers include requests equivalent to:

- search for high-value jobs;
- find recruiters for selected jobs or target companies;
- inspect or update an application after user confirmation;
- inspect or update recruiter outreach after user confirmation;
- produce a daily report;
- inspect token consumption and cache efficiency.

Skill design requirements:

- folder and skill name: `operate-archimedes`;
- keep `SKILL.md` concise, ideally below 150 lines and always below 500 lines;
- include only trigger guidance, command routing, confirmation boundaries, failure handling and compact output expectations;
- invoke stable CLI commands instead of reimplementing logic in prose;
- load focused references only when the selected operation requires them;
- never copy this complete `AGENTS.md` into the skill;
- never duplicate job filters, scoring weights, database schema or crawler details already owned by canonical repository documentation;
- never embed generated jobs, recruiter records, reports, resume contents or mutable operational state;
- never use Google MCP as an operational datastore;
- never bypass the configured token budget, source rate limits or LinkedIn safety boundaries;
- require explicit user confirmation before any application/outreach state is marked as submitted or sent;
- return compact database/CLI results by default and request verbose output only for diagnosis;
- include deterministic helper scripts only when the same reliable operation would otherwise be rewritten repeatedly;
- validate the skill with realistic read-only prompts before allowing state-changing workflows.

Recommended skill routing:

```text
job discovery          -> search:jobs
recruiter discovery    -> search:recruiters
application tracking   -> applications:update (confirmation required)
outreach tracking      -> outreach:update (confirmation required)
daily summary          -> report:daily
token diagnostics      -> tokens:report
```

Before creating the skill:

1. freeze or version the public CLI contract;
2. verify a fresh database migration;
3. verify the legacy import and reconciliation flow;
4. run job and recruiter discovery locally for several real sessions;
5. record recurring operational friction;
6. design the skill around observed workflows rather than hypothetical commands;
7. initialize and validate it using the current Codex skill-creation protocol;
8. keep skill changes version-controlled according to the active Codex skill requirements.

If the CLI changes materially, update and revalidate the skill in the same change or explicitly mark it incompatible. The repository remains functional without the skill; the skill must never become a hidden runtime dependency.

## Agent operating protocol

For every implementation task:

1. inspect the smallest relevant set of files;
2. state assumptions only when they affect the design;
3. preserve unrelated user changes;
4. make the smallest coherent change that advances the target architecture;
5. add or update migrations and tests with the implementation;
6. run relevant verification;
7. summarize outcome, verification and remaining risk concisely.

Agent restrictions:

- Do not scan or paste the whole repository into context when targeted search is enough.
- Use `rg`/`rg --files` to locate code before reading full files.
- Do not rewrite working modules for style alone.
- Do not introduce generic repositories, factories, event buses or abstractions without at least two concrete consumers or a tested boundary need.
- Do not create microservices.
- Do not add a frontend before the CLI and data model are solid.
- Do not put business logic in CLI handlers, database models, migrations or source adapters.
- Do not store operational state in Markdown or commit generated search results.
- Do not perform external writes or person-directed actions without explicit confirmation.
- Do not silently loosen hard filters to hit a requested count.
- Do not generate cover letters, DMs or long explanations until a candidate passes the quality gate and the user requests or reaches that step.

## Definition of done

A change is done only when:

- behavior matches this constitution and the relevant domain reference;
- data invariants are enforced at the appropriate layer;
- migrations are safe and reversible where practical;
- deterministic logic is tested;
- external calls are bounded, cached and observable;
- token consumption cannot grow unbounded;
- logs contain no secrets;
- documentation reflects material architectural changes;
- relevant lint, typecheck and tests pass or unrun checks are explicitly disclosed.

When requirements conflict, protect user data, account safety, eligibility quality and token budget before convenience or lead volume.
