## What It Challenged Me On (25 Questions)

### Q1 — MVP Promise
It asked me to define the exact scope before building anything.

### Q2 — Ambiguous and Unsupported Queries
It asked how the app handles queries that are unclear or outside scope.

### Q3 — LLM vs Gold Data for Factual Retrieval
It asked whether the LLM should reason over raw data or only pre-aggregated gold views.

### Q4 — UCL Standings Outside League Phase
It asked what "standings" means for Champions League once the competition leaves the group/league phase.

### Q5 — Entity Matching Strictness
It asked how strict alias matching should be for teams and competitions.

### Q6 — Single Snapshot vs Cross-Day Deltas
It asked whether answers should come from one snapshot or compute changes across days.

### Q7 — ETL Failure Serving Policy
It asked what to serve when the ETL fails or only partially updates.

### Q8 — Structured Intent Classification vs One-Shot Prompt
It asked whether the LLM should classify intent first or interpret and answer in one free-form call.

### Q9 — Conversational Memory Within a Session
It asked how much session state the app should keep between turns.

### Q10 — Top Scorers Contract
It asked the exact rules for player-name queries and what to do when a player is absent from scorer data.

### Q11 — Timezone and Date Format Contract
It asked what timezone to display fixture and result dates in, and what format to use.

### Q12 — Gold File Schema Contract
It asked for the exact schema of every gold file so retrieval stays deterministic and testable.

### Q13 — API Boundary Between Backend and Frontend
It asked where the boundary sits between backend logic and UI rendering for citations and refusals.

### Q14 — Deployment and Ops Target
It asked where to deploy the serving app and how GCS reads should be handled at runtime.

### Q15 — Testing Strategy
It asked for the exact testing strategy that proves the app is trustworthy before launch.

### Q16 — LLM Model and Runtime Contract
It asked for the exact model choice, timeouts, cost guardrails, and fallback behaviour.

### Q17 — ETL Idempotency and Source Limit Policy
It asked for the exact call inventory, retry strategy, and bronze storage policy for football-data.org.

### Q18 — Source Endpoint Verification
It asked whether the free-tier endpoints actually support all 4 intents for both competitions.

### Q19 — Secrets and Configuration Boundary
It asked for the exact credential strategy across GitHub Actions, Vercel, and GCP.

### Q20 — Vercel vs Cloud Run
It caught an inconsistency between Q14 (Cloud Run) and Q19 (Vercel semantics) and forced a final decision.

### Q21 — Vercel-to-GCS Credential Strategy
It asked for the exact app-to-GCS credential contract given Vercel is confirmed as the deployment target.

### Q22 — Abuse and Cost Control
It asked for a rate limiting and input validation strategy for a public endpoint with no auth.

### Q23 — Observability Without Privacy Liability
It asked what to log for debugging without storing raw user text or building a privacy liability.

### Q24 — Empty Retrieval Handling
It asked what happens when the classifier resolves a supported intent but retrieval returns no rows.

### Q25 — Stop or Go Deeper
It asked whether to stop and synthesize or keep drilling into lower-level implementation details.

---

## What I Changed Because of This

### MVP Scope (Q1)
Locked to current season only, 2 competitions (EPL + UCL), 4 intents (standings, results, scorers, fixtures), daily snapshot with date citation. Explicit out-of-scope list defined upfront.

### Ambiguity Handling (Q2)
Adopted trustworthy stats assistant path. One clarification question max. Hard-refuse unsupported queries with no partial answers. Never default competition silently.

### Gold-Only LLM Access (Q3)
LLM never touches bronze or silver at runtime. 4 pre-shaped gold views per intent. LLM role is classification, entity extraction, and response phrasing only. One unified gold file per intent containing both competitions with a `competition` field.

### UCL Phase Field (Q4)
Added `ucl_phase` field to UCL standings gold file: `"league_phase"` | `"knockouts"` | `"off_season"`. During knockouts, standings questions are hard-refused with a redirect to results or fixtures. Bracket/progression data is explicitly v2.

### Static Alias Map (Q5)
Added `aliases.json` to repo root with controlled competition and team alias lists. Deterministic matching only — no fuzzy matching. "United" triggers clarification, not a default to Manchester United.

### Single Snapshot Only (Q6)
All answers grounded in latest successful snapshot only. No delta queries. `latest.json` always overwritten daily. Every response cites snapshot date. Delta queries hard-refused with redirect to current data.

### Atomic Snapshot Contract (Q7)
All 8 gold files (4 intents × 2 competitions) must succeed before any `latest.json` is overwritten. ETL writes to staging first, then promotes atomically. `manifest.json` gates serving — status must be `"complete"` before the app serves any data.

### Two-Step Classification Architecture (Q8)
Step 1: LLM classification call returns structured JSON (intent + slots + confidence). Step 2: App code fetches gold, then Step 3: LLM phrasing call with grounding-locked prompt. Low confidence forces clarify in app code. App code controls all data decisions — LLM only classifies and phrases.

### Minimal Session State (Q9)
Session state: `pending_clarification` + `last_resolved_competition` only. No history array. Clarification auto-completes original query when resolved. Competition reused for one follow-up turn only and shown explicitly in the answer. State cleared aggressively after every answered query.

### Top Scorers Contract Correction (Q10 + Q18)
Free tier returns top 10 per competition, not 20. Gold schema updated: max 10 rows per competition. Absent player returns "not in current top 10" — never zero. Player queries supported only within top-scorers intent. No general player lookups.

### Timezone Contract (Q11)
Bronze: raw UTC timestamps. Silver: normalized to UTC ISO 8601. Gold: `display_date` precomputed to Europe/London (BST/GMT). No runtime timezone conversion. Upcoming fixtures include both kickoff time and date. Completed results include match date, no kickoff time.

### Strict Versioned Gold Schema (Q12)
Every gold file: `schema_version`, `snapshot_date`, `display_timezone`, `competition`, `intent`, `data`. One file per intent containing both competitions in a `competitions` map. Pydantic validation before any staging write. Hard fail on any missing required field.

### Backend Owns All Copy (Q13)
API response contract: `status`, `answer_text`, `refusal_code`, `snapshot_date`, `competition`, `intent`, `assumption_used`, `assumption_detail`, `clarification_prompt`, `citation`. Frontend renders only — constructs nothing. LLM output validated against gold payload before returning. Deterministic fallback if grounding check fails.

### Vercel Deployment + 5-Min Cache (Q14 + Q20)
Deployment target confirmed as Vercel (hard assignment requirement). Next.js API routes for `/api/chat`. In-memory cache with 5-minute TTL, 8 slots (4 intents × 2 competitions). Cache keyed by intent+competition. `latest.json` always read — no date selection.

### Contract-Boundary Test Suite (Q15)
Tests: unit (aliases, session, slots, refusals), contract (gold schema, manifest, API response), classifier (supported/ambiguous/unsupported), answer (grounding, fallback), e2e (7 flows). All CI stages block deploy on failure. Mocked LLM in CI — real calls for manual smoke tests only. Checked-in `tests/fixtures/` — no live GCS or API calls in tests. Playwright MCP for UI/E2E flows.

### gpt-4o-mini for Both LLM Calls (Q16)
Same model for classification and answer phrasing. Classification: max 150 tokens, temperature 0, timeout 3s. Answer: max 300 tokens, temperature 0.2, timeout 5s. On classification failure: return `clarify`. On answer failure: return deterministic template from gold payload. Target latency under 5s p50.

### ETL Idempotency + 6-Call Inventory (Q17)
Exactly 6 API calls per daily run: standings + matches + scorers for EPL and UCL. 700ms delay between calls. Idempotent by snapshot date. One retry at 06:00 UTC if midnight run fails. Bronze written always (30-day retention via GCS lifecycle). Hard fail on schema drift — named field logged in manifest.

### Preflight Check Added (Q18)
ETL starts with a preflight check: lightweight GET to all 6 endpoints before any data fetch. Any non-200 or unexpected schema → abort entire run, write `manifest: preflight_failed`, alert via GitHub Actions. Zero bronze/silver/gold written on preflight failure.

### Two Service Accounts + Vercel Env Vars (Q19 + Q21)
`etl-runner`: Storage Object Creator + Viewer → GitHub Actions secret `GCP_SA_KEY`. `app-runner`: Storage Object Viewer only → Vercel encrypted env var `GCP_SA_KEY_APP`. Bucket stays fully private — no signed URLs, no public object access. `config.js` startup module validates all 3 required env vars and hard-fails on any missing.

### Rate Limiting + Input Cap (Q22)
10 requests per IP per minute, 50 per hour. In-memory sliding window counter. 300-character input hard cap. Empty string rejected before LLM call. On limit exceeded: HTTP 429 with generic "try again shortly" — no quota details exposed. No streaming.

### Metadata-Only Observability (Q23)
Structured log per request: request_id, timestamp, status, intent, competition, assumption_used, snapshot_date_served, llm_fallback_used, grounding_violation, latency breakdown, input_length_bucket, error_code. No raw user text in persistent logs. Grounding violations logged as failure code only — rejected LLM text never persisted. Debug endpoint `GET /api/debug` protected by `X-Debug-Key` header returns manifest + cache status + env var presence.

### Empty Retrieval Reason Codes (Q24)
Retriever returns `empty_reason` field: `not_in_current_window` | `not_in_top_scorers` | `competition_phase_unsupported` | `data_unavailable`. Empty reason skips LLM entirely — deterministic refusal only. `refusal_code` added to Q13 API response contract for frontend styling without string parsing. Never search older snapshots. Never infer "no match scheduled" from a missing fixture window result.

### Stop and Synthesize (Q25)
All high-risk product, data, runtime, and ops decisions resolved. Stopped grilling at Q25 to synthesize into a build spec. Lower-level details (repo layout, file naming, exact API schemas) resolved during implementation.

---

## Final Architecture Summary

```
football-data.org
    ↓ (6 API calls, 700ms delay, preflight check)
GitHub Actions ETL (daily 00:00 UTC, retry 06:00 UTC)
    ↓ bronze → silver (pydantic validate) → gold/staging
    ↓ all 8 gold files pass? → promote to latest.json × 8
    ↓ write manifest.json { status: complete | failed }
GCS Bucket (private, two service accounts)
    ↓ app-runner reads via Vercel server env var
Vercel (Next.js) — /api/chat
    ↓ config.js startup validation
    ↓ rate limiter (10/min, 50/hr per IP)
    ↓ input validation (300 char cap)
    ↓ LLM call 1: classification → intent + slots + confidence
    ↓ manifest check → cache check → GCS read (5-min TTL)
    ↓ LLM call 2: grounded phrasing → grounding check
    ↓ deterministic fallback if grounding fails
    ↓ structured API response payload (Q13 + Q24 contract)
Frontend (Next.js) — renders status-based response only
```