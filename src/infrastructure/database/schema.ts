import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const remoteClassificationEnum = pgEnum("remote_classification", [
  "remote_global",
  "remote_region",
  "remote_country",
  "hybrid",
  "onsite",
  "unknown"
]);

export const priorityTierEnum = pgEnum("priority_tier", ["target", "high", "medium", "low"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "career_page",
  "linkedin_public_search",
  "manual"
]);
export const jobLifecycleStateEnum = pgEnum("job_lifecycle_state", [
  "open",
  "closed",
  "stale",
  "duplicate",
  "ignored"
]);
export const jobVerdictEnum = pgEnum("job_verdict", [
  "strong_apply",
  "apply",
  "maybe",
  "skip"
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "closed"
]);
export const outreachStatusEnum = pgEnum("outreach_status", [
  "none",
  "pending",
  "sent",
  "replied",
  "closed"
]);
export const searchRunStatusEnum = pgEnum("search_run_status", [
  "running",
  "completed",
  "failed",
  "budget_stopped"
]);
export const searchItemDispositionEnum = pgEnum("search_item_disposition", [
  "accepted",
  "deduplicated",
  "filtered",
  "evaluated",
  "errored"
]);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    domain: text("domain"),
    careersUrl: text("careers_url"),
    remoteClassification: remoteClassificationEnum("remote_classification").default("unknown").notNull(),
    priorityTier: priorityTierEnum("priority_tier").default("medium").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("companies_normalized_name_unique").on(table.normalizedName),
    uniqueIndex("companies_domain_unique").on(table.domain)
  ]
);

export const jobSources = pgTable(
  "job_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceIdentifier: text("source_identifier").notNull(),
    url: text("url").notNull(),
    cursor: text("cursor"),
    etag: text("etag"),
    lastModified: text("last_modified"),
    crawlPolicy: jsonb("crawl_policy").$type<Record<string, unknown>>().default({}).notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("job_sources_type_identifier_unique").on(table.sourceType, table.sourceIdentifier),
    index("job_sources_company_idx").on(table.companyId)
  ]
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    sourceId: uuid("source_id").references(() => jobSources.id, { onDelete: "set null" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    externalJobId: text("external_job_id"),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    locationText: text("location_text"),
    locationFingerprint: text("location_fingerprint"),
    canonicalUrl: text("canonical_url").notNull(),
    applicationUrl: text("application_url"),
    lifecycleState: jobLifecycleStateEnum("lifecycle_state").default("open").notNull(),
    descriptionHash: text("description_hash"),
    compensationText: text("compensation_text"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("jobs_source_external_id_unique")
      .on(table.sourceType, table.externalJobId)
      .where(sql`${table.externalJobId} is not null`),
    uniqueIndex("jobs_canonical_url_unique").on(table.canonicalUrl),
    uniqueIndex("jobs_company_role_location_unique")
      .on(table.companyId, table.normalizedTitle, table.locationFingerprint)
      .where(sql`${table.companyId} is not null and ${table.locationFingerprint} is not null`),
    index("jobs_lifecycle_state_idx").on(table.lifecycleState)
  ]
);

export const jobSnapshots = pgTable(
  "job_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("job_snapshots_job_hash_unique").on(table.jobId, table.contentHash),
    index("job_snapshots_job_idx").on(table.jobId)
  ]
);

export const jobEvaluations = pgTable(
  "job_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    rulesetVersion: text("ruleset_version").notNull(),
    evaluator: text("evaluator").default("deterministic").notNull(),
    model: text("model"),
    verdict: jobVerdictEnum("verdict").notNull(),
    totalScore: integer("total_score").notNull(),
    componentScores: jsonb("component_scores").$type<Record<string, number>>().notNull(),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull(),
    inputHash: text("input_hash").notNull(),
    tokenInput: integer("token_input").default(0).notNull(),
    tokenOutput: integer("token_output").default(0).notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }).default("0").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("job_evaluations_job_ruleset_input_unique").on(table.jobId, table.rulesetVersion, table.inputHash),
    check("job_evaluations_total_score_range", sql`${table.totalScore} between 0 and 100`)
  ]
);

export const recruiters = pgTable(
  "recruiters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    linkedinUrl: text("linkedin_url"),
    title: text("title"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    companyNameText: text("company_name_text"),
    relevanceSignals: jsonb("relevance_signals").$type<string[]>().default([]).notNull(),
    identityConfidence: integer("identity_confidence").default(0).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("recruiters_linkedin_url_unique")
      .on(table.linkedinUrl)
      .where(sql`${table.linkedinUrl} is not null`),
    index("recruiters_company_idx").on(table.companyId),
    check("recruiters_identity_confidence_range", sql`${table.identityConfidence} between 0 and 100`)
  ]
);

export const recruiterSources = pgTable(
  "recruiter_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recruiterId: uuid("recruiter_id").notNull().references(() => recruiters.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceSnippet: text("source_snippet"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("recruiter_sources_recruiter_url_unique").on(table.recruiterId, table.sourceUrl)
  ]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").default("interested").notNull(),
    confirmedByUser: boolean("confirmed_by_user").default(false).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("applications_job_unique").on(table.jobId)
  ]
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatusEnum("from_status"),
    toStatus: applicationStatusEnum("to_status").notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).defaultNow().notNull(),
    confirmedByUser: boolean("confirmed_by_user").default(false).notNull(),
    notes: text("notes")
  },
  (table) => [
    index("application_events_application_idx").on(table.applicationId)
  ]
);

export const outreach = pgTable(
  "outreach",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recruiterId: uuid("recruiter_id").notNull().references(() => recruiters.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    status: outreachStatusEnum("status").default("none").notNull(),
    draft: text("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    confirmedByUser: boolean("confirmed_by_user").default(false).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("outreach_recruiter_job_unique")
      .on(table.recruiterId, table.jobId)
      .where(sql`${table.jobId} is not null`),
    uniqueIndex("outreach_recruiter_general_unique")
      .on(table.recruiterId)
      .where(sql`${table.jobId} is null`),
    index("outreach_job_idx").on(table.jobId)
  ]
);

export const searchRuns = pgTable("search_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  status: searchRunStatusEnum("status").default("running").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  counters: jsonb("counters").$type<Record<string, number>>().default({}).notNull(),
  tokenInput: integer("token_input").default(0).notNull(),
  tokenOutput: integer("token_output").default(0).notNull(),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }).default("0").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true })
});

export const searchRunItems = pgTable("search_run_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  searchRunId: uuid("search_run_id").notNull().references(() => searchRuns.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  sourceUrl: text("source_url"),
  disposition: searchItemDispositionEnum("disposition").notNull(),
  reasonCodes: jsonb("reason_codes").$type<string[]>().default([]).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const llmCache = pgTable(
  "llm_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inputHash: text("input_hash").notNull(),
    schemaVersion: text("schema_version").notNull(),
    model: text("model").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("llm_cache_identity_unique").on(table.inputHash, table.schemaVersion, table.model)
  ]
);
