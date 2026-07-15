CREATE TYPE "remote_classification" AS ENUM ('remote_global', 'remote_region', 'remote_country', 'hybrid', 'onsite', 'unknown');
CREATE TYPE "priority_tier" AS ENUM ('target', 'high', 'medium', 'low');
CREATE TYPE "source_type" AS ENUM ('greenhouse', 'lever', 'ashby', 'workable', 'career_page', 'linkedin_public_search', 'manual');
CREATE TYPE "job_lifecycle_state" AS ENUM ('open', 'closed', 'stale', 'duplicate', 'ignored');
CREATE TYPE "job_verdict" AS ENUM ('strong_apply', 'apply', 'maybe', 'skip');
CREATE TYPE "application_status" AS ENUM ('interested', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'closed');
CREATE TYPE "outreach_status" AS ENUM ('none', 'pending', 'sent', 'replied', 'closed');
CREATE TYPE "search_run_status" AS ENUM ('running', 'completed', 'failed', 'budget_stopped');
CREATE TYPE "search_item_disposition" AS ENUM ('accepted', 'deduplicated', 'filtered', 'evaluated', 'errored');

CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "domain" text,
  "careers_url" text,
  "remote_classification" "remote_classification" DEFAULT 'unknown' NOT NULL,
  "priority_tier" "priority_tier" DEFAULT 'medium' NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "job_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid,
  "source_type" "source_type" NOT NULL,
  "source_identifier" text NOT NULL,
  "url" text NOT NULL,
  "cursor" text,
  "etag" text,
  "last_modified" text,
  "crawl_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid,
  "source_id" uuid,
  "source_type" "source_type" NOT NULL,
  "external_job_id" text,
  "title" text NOT NULL,
  "normalized_title" text NOT NULL,
  "location_text" text,
  "location_fingerprint" text,
  "canonical_url" text NOT NULL,
  "application_url" text,
  "lifecycle_state" "job_lifecycle_state" DEFAULT 'open' NOT NULL,
  "description_hash" text,
  "compensation_text" text,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "job_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "raw_payload" jsonb NOT NULL,
  "fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "job_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "ruleset_version" text NOT NULL,
  "evaluator" text DEFAULT 'deterministic' NOT NULL,
  "model" text,
  "verdict" "job_verdict" NOT NULL,
  "total_score" integer NOT NULL,
  "component_scores" jsonb NOT NULL,
  "reason_codes" jsonb NOT NULL,
  "input_hash" text NOT NULL,
  "token_input" integer DEFAULT 0 NOT NULL,
  "token_output" integer DEFAULT 0 NOT NULL,
  "estimated_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
  "evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_evaluations_total_score_range" CHECK ("job_evaluations"."total_score" between 0 and 100)
);

CREATE TABLE "recruiters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "linkedin_url" text,
  "title" text,
  "company_id" uuid,
  "company_name_text" text,
  "relevance_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "identity_confidence" integer DEFAULT 0 NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "recruiters_identity_confidence_range" CHECK ("recruiters"."identity_confidence" between 0 and 100)
);

CREATE TABLE "recruiter_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recruiter_id" uuid NOT NULL,
  "source_type" "source_type" NOT NULL,
  "source_url" text NOT NULL,
  "source_snippet" text,
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "status" "application_status" DEFAULT 'interested' NOT NULL,
  "confirmed_by_user" boolean DEFAULT false NOT NULL,
  "applied_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "application_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "from_status" "application_status",
  "to_status" "application_status" NOT NULL,
  "event_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmed_by_user" boolean DEFAULT false NOT NULL,
  "notes" text
);

CREATE TABLE "outreach" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recruiter_id" uuid NOT NULL,
  "job_id" uuid,
  "status" "outreach_status" DEFAULT 'none' NOT NULL,
  "draft" text,
  "sent_at" timestamp with time zone,
  "confirmed_by_user" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "search_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "status" "search_run_status" DEFAULT 'running' NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "counters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "token_input" integer DEFAULT 0 NOT NULL,
  "token_output" integer DEFAULT 0 NOT NULL,
  "estimated_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone
);

CREATE TABLE "search_run_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "search_run_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "source_url" text,
  "disposition" "search_item_disposition" NOT NULL,
  "reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "llm_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "input_hash" text NOT NULL,
  "schema_version" text NOT NULL,
  "model" text NOT NULL,
  "result" jsonb NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "job_sources" ADD CONSTRAINT "job_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE set null;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE set null;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_id_job_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "job_sources"("id") ON DELETE set null;
ALTER TABLE "job_snapshots" ADD CONSTRAINT "job_snapshots_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade;
ALTER TABLE "job_evaluations" ADD CONSTRAINT "job_evaluations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade;
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE set null;
ALTER TABLE "recruiter_sources" ADD CONSTRAINT "recruiter_sources_recruiter_id_recruiters_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE cascade;
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade;
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE cascade;
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_recruiter_id_recruiters_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE cascade;
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE set null;
ALTER TABLE "search_run_items" ADD CONSTRAINT "search_run_items_search_run_id_search_runs_id_fk" FOREIGN KEY ("search_run_id") REFERENCES "search_runs"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "companies_normalized_name_unique" ON "companies" ("normalized_name");
CREATE UNIQUE INDEX "companies_domain_unique" ON "companies" ("domain");
CREATE UNIQUE INDEX "job_sources_type_identifier_unique" ON "job_sources" ("source_type", "source_identifier");
CREATE INDEX "job_sources_company_idx" ON "job_sources" ("company_id");
CREATE UNIQUE INDEX "jobs_source_external_id_unique" ON "jobs" ("source_type", "external_job_id") WHERE "external_job_id" is not null;
CREATE UNIQUE INDEX "jobs_canonical_url_unique" ON "jobs" ("canonical_url");
CREATE UNIQUE INDEX "jobs_company_role_location_unique" ON "jobs" ("company_id", "normalized_title", "location_fingerprint") WHERE "company_id" is not null and "location_fingerprint" is not null;
CREATE INDEX "jobs_lifecycle_state_idx" ON "jobs" ("lifecycle_state");
CREATE UNIQUE INDEX "job_snapshots_job_hash_unique" ON "job_snapshots" ("job_id", "content_hash");
CREATE INDEX "job_snapshots_job_idx" ON "job_snapshots" ("job_id");
CREATE UNIQUE INDEX "job_evaluations_job_ruleset_input_unique" ON "job_evaluations" ("job_id", "ruleset_version", "input_hash");
CREATE UNIQUE INDEX "recruiters_linkedin_url_unique" ON "recruiters" ("linkedin_url") WHERE "linkedin_url" is not null;
CREATE INDEX "recruiters_company_idx" ON "recruiters" ("company_id");
CREATE UNIQUE INDEX "recruiter_sources_recruiter_url_unique" ON "recruiter_sources" ("recruiter_id", "source_url");
CREATE UNIQUE INDEX "llm_cache_identity_unique" ON "llm_cache" ("input_hash", "schema_version", "model");
