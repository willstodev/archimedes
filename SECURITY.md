# Security Policy

## Public Data Boundary

Archimedes is local-first. The public repository must contain only source code, migrations, tests, safe placeholders, and generic documentation.

Do not commit:

- real `.env` files or credentials;
- API keys, tokens, cookies, browser profiles, or session storage;
- resumes, private profile data, cover letters, recruiter messages, or generated reports;
- imported Google Sheets, CSV, JSON, or Markdown tracker data;
- LinkedIn data exports or login-gated data;
- database dumps, backups, or local PostgreSQL volume contents.

## Local Secrets

Use `.env.example` as a placeholder template only. Put real values in `.env`, which is ignored by Git.

## External Actions

The application must not submit job applications, send recruiter messages, connect with people, or mutate third-party systems without explicit user confirmation.

## Reporting Issues

If you find a secret, private data exposure, or unsafe automation path, rotate any affected credentials immediately and remove the data from both the working tree and Git history before publishing.
