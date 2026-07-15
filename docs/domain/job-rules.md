# Job Rules

Canonical scoring weights and hard-skip boundaries live in [AGENTS.md](../../AGENTS.md). Implementation should encode them in tested domain modules, not in CLI handlers, migrations, or source adapters.

Current deterministic scoring components:

- Stack fit: 30.
- Remote/location eligibility: 25.
- Seniority fit: 15.
- Company/product quality: 10.
- Compensation potential: 10.
- Application friction: 10.

Verdicts:

- `strong_apply`: 85-100.
- `apply`: 75-84.
- `maybe`: 60-74.
- `skip`: below 60 or any hard-skip reason.

Hard filters must run before optional LLM evaluation. Obvious accepts and rejects should not consume tokens.
