# Architecture

## Overview

This project is a trust-first Football Q&A app for:

- Premier League
- UEFA Champions League

It supports one configured season at a time, with the initial target season set in configuration. The app answers only four factual intent types:

- standings
- recent results
- top scorers
- upcoming fixtures

All answers come from the latest fully successful daily snapshot. The app does not answer from live source APIs at runtime, and it does not compute historical deltas across snapshots.

## System Flow

```text
football-data.org
  -> GitHub Actions ETL
  -> bronze JSON in GCS
  -> silver normalized JSON
  -> gold serving JSON
  -> manifest publish
  -> Vercel Next.js app
  -> /api/chat
  -> classify -> retrieve -> answer
  -> frontend chat UI
```

## Data Pipeline

### Schedule

- Primary ETL run: `00:00 UTC` daily
- Retry run: `06:00 UTC` the same day if the primary run fails

### Source Calls

Each ETL run uses exactly 6 `football-data.org` calls:

- EPL standings
- EPL matches
- EPL scorers
- UCL standings
- UCL matches
- UCL scorers

Calls are paced with a `1500ms` delay between requests.

### Preflight

Before any fetch or write begins, the ETL runs a preflight check against all 6 required endpoints.

If preflight fails:

- no bronze is written
- no silver is written
- no gold is written
- manifest is marked `preflight_failed`

### Bronze

Bronze stores the raw source payloads in GCS by endpoint and snapshot date.

Goals:

- auditability
- replayability
- source debugging

### Silver

Silver normalizes bronze payloads into stable internal structures.

Rules:

- strict schema validation
- hard fail on missing required fields
- hard fail on source shape drift

### Gold

Gold is the only runtime data source for the serving app.

Gold outputs cover:

- standings
- recent results
- top scorers
- upcoming fixtures

Each gold file is shaped for direct retrieval and answering, with precomputed display fields so the app does not do runtime timezone formatting.

### Atomic Publish

The serving contract is atomic.

A new snapshot becomes live only if all required gold outputs succeed for both competitions. Gold artifacts are written to staging first, then promoted together. If any part fails, the previously live snapshot stays in place.

## Manifest Contract

The ETL publishes a manifest that tells the serving app whether a snapshot is safe to serve.

Manifest responsibilities:

- report last successful snapshot date
- report run status
- gate serving behavior

Expected statuses:

- `complete` — all 8 gold files written successfully
- `partial` — some endpoints were skipped (e.g. 429 rate limit) but core files exist
- `failed` — run failed after retries
- `preflight_failed` — source API was unreachable before any fetch began

If the latest run is not `complete`, the app continues serving the last successful snapshot.

## Runtime Architecture

### Deployment

- App framework: Next.js
- Hosting: Vercel
- Storage: private GCS bucket

### Credentials

Two separate service accounts are used:

- `etl-runner`: write access for GitHub Actions ETL
- `app-runner`: read-only access for the Vercel app

The bucket remains private at all times.

### Startup Config

A server-only config module validates required environment variables at startup.

Required runtime config (Vercel):

- `GCP_SA_KEY_APP` — service account JSON for GCS reads (read-only)
- `GCP_BUCKET_NAME` — GCS bucket name

Required ETL config (GitHub Actions):

- `FOOTBALL_API_KEY` — football-data.org API key
- `GCP_SA_KEY` — service account JSON for GCS writes
- `GCP_BUCKET_NAME` — GCS bucket name
- `SEASON` — season year (e.g. `2024`)

No LLM API key is required at runtime. The classifier and answerer are fully rule-based.

Startup fails fast if required config is missing.

## Chat Request Flow

The runtime path is intentionally narrow and deterministic.

### Step 1: Validate Request

Before any expensive work:

- enforce `300` character max input
- apply IP rate limits

Rate limits:

- `10` requests/minute/IP
- `50` requests/hour/IP

### Step 2: Session Handling

Session state is minimal:

- `pending_clarification`
- `last_resolved_competition`

Rules:

- at most one clarification question
- one-turn competition reuse only for same-intent follow-ups
- aggressive state clearing after answers or refusals

### Step 3: Classification

Classification is handled by a rule-based model client (`src/lib/rule-based-model-client.js`). No external API call is made.

The classifier uses regex keyword patterns to detect intent and competition:

- **Intent patterns:** standings, top_scorers, recent_results, upcoming_fixtures
- **Competition patterns:** EPL (premier league, prem, epl), UCL (champions league, ucl)
- **Out-of-scope patterns:** injuries, transfers, assists, wages, manager, history, etc.

Supported result types:

- `high` confidence — both intent and competition detected → proceed to retrieval
- `low` confidence — intent or competition missing → return clarification prompt
- `refuse` — out-of-scope keyword matched → return refusal message

Low-confidence classification is returned as a `clarify` response before retrieval.

### Step 4: Retrieval

Retrieval reads only gold files, never bronze or silver.

Retriever responsibilities:

- read manifest first
- enforce live snapshot gating
- read gold data from GCS
- cache results in memory for 5 minutes
- return deterministic empty-result reason codes

Example empty-result codes:

- `not_in_current_window`
- `not_in_top_scorers`
- `competition_phase_unsupported`
- `data_unavailable`

### Step 5: Answer Generation

Answer generation is handled by the same rule-based model client (`src/lib/rule-based-model-client.js`). No external API call is made.

Template formatters produce grounded answers directly from the retrieved gold data:

- **standings** — top 5 rows with position, team, points, W/D/L
- **top_scorers** — top 5 rows with rank, player, team, goals
- **recent_results** — last 5 finished matches with scores
- **upcoming_fixtures** — next 5 scheduled matches with dates

Every answer includes a snapshot citation ("Data as of YYYY-MM-DD"). If the gold file returns empty rows, a deterministic fallback message is returned instead.

## Domain Rules

### Scope Rules

Supported:

- one configured season
- EPL
- UCL
- standings
- recent results
- top scorers
- upcoming fixtures

Out of scope:

- historical seasons
- live scores
- delta queries
- transfer news
- injuries
- assists
- squad lookup
- UCL bracket/progression

### Ambiguity Rules

- never silently default competition
- ask one clarification when competition or team is ambiguous
- refuse unsupported questions cleanly

### UCL Standings Rule

UCL standings are supported only during the league phase.

During knockout rounds, standings requests are refused with a redirect toward supported intents such as recent results or upcoming fixtures.

### Timezone Rule

- raw source timestamps remain UTC
- display dates are precomputed in ETL
- user-facing display timezone is `Europe/London`

## API Shape

The backend owns all response wording and business logic. The frontend only renders the API contract.

Expected response fields include:

- `status`
- `answer_text`
- `refusal_code`
- `snapshot_date`
- `competition`
- `intent`
- `assumption_used`
- `assumption_detail`
- `clarification_prompt`
- `citation`

## Frontend Responsibilities

The UI is intentionally thin.

Responsibilities:

- submit chat input
- enforce client-side character cap
- render answer/clarify/refuse/unavailable states
- show citation block
- show assumption banner when applicable
- show clarification bubble flow

The frontend does not:

- build refusal text
- interpret football logic
- fetch GCS directly

## Observability

Persistent logs store metadata only, not raw user text.

Examples:

- request id
- timestamp
- status
- resolved intent
- resolved competition
- assumption used
- snapshot date served
- fallback used
- grounding violation code
- latency buckets
- input length bucket

There is also a protected debug endpoint that exposes:

- manifest status
- live snapshot info
- cache status

## Testing Strategy

The architecture is designed around contract-focused testing.

Test layers:

- unit tests for aliases, session rules, slot resolution, refusals
- contract tests for gold schema, manifest, and API shape
- classifier tests for supported, ambiguous, unsupported inputs
- answer tests for grounding and fallback behavior
- end-to-end tests for answered, clarify, refuse, and unavailable flows
- Playwright walkthrough for one answered and one refusal scenario

Automated tests use checked-in fixtures and injected in-memory stubs for storage and model clients. No external API calls are made during tests. Playwright E2E tests run against the live Vercel deployment using a real browser (Chromium headless).
