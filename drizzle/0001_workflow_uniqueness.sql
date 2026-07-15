CREATE UNIQUE INDEX "applications_job_unique" ON "applications" ("job_id");
CREATE INDEX "application_events_application_idx" ON "application_events" ("application_id");
CREATE UNIQUE INDEX "outreach_recruiter_job_unique" ON "outreach" ("recruiter_id", "job_id") WHERE "job_id" is not null;
CREATE UNIQUE INDEX "outreach_recruiter_general_unique" ON "outreach" ("recruiter_id") WHERE "job_id" is null;
CREATE INDEX "outreach_job_idx" ON "outreach" ("job_id");
