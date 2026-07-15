# Token Budget

LLMs are an exception layer for ambiguous, high-potential candidates. They are not crawlers, databases, deduplicators, or primary classifiers.

Required pipeline:

1. Check PostgreSQL identity and freshness.
2. Normalize and deduplicate locally.
3. Apply hard filters and deterministic scoring.
4. Skip LLM calls for obvious accepts and rejects.
5. Send only compact decision DTOs for ambiguous candidates.
6. Cache successful structured results by content hash, schema version, prompt/ruleset version, and model.

Every optional LLM call must record input tokens, output tokens, latency where available, cache hit state, and estimated cost. Per-run and per-day budgets must stop optional evaluation before the configured limit is exceeded.
