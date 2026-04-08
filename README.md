# Football Stats Q&A

Football Q&A app for Premier League and UEFA Champions League data, backed by a daily ETL pipeline from `football-data.org`, gold JSON snapshots in GCS, and a Next.js serving app on Vercel.

Parent PRD: [#1](https://github.com/subashshrestha189/football-stats-qa/issues/1)

## Recommended Execution Order

Recommended first 5 issues:

1. [#2 Seed repo configuration and alias contract](https://github.com/subashshrestha189/football-stats-qa/issues/2)  
   This gives everything else a stable base: configured season, alias rules, and the shared config contract.
2. [#3 ETL preflight check for 6 required football-data endpoints](https://github.com/subashshrestha189/football-stats-qa/issues/3)  
   Start proving source availability early so the pipeline fails fast before any write logic exists.
3. [#4 Bronze fetch pipeline with 6 calls, delay, and raw GCS writes](https://github.com/subashshrestha189/football-stats-qa/issues/4)  
   Once preflight exists, capture the raw source payloads so the rest of ETL work can iterate from stable bronze data.
4. [#5 Silver normalization and schema validation for fetched source payloads](https://github.com/subashshrestha189/football-stats-qa/issues/5)  
   This locks the internal data contract and catches source-shape drift before gold shaping starts.
5. [#6 Build all gold views for EPL and UCL in a single ETL pass](https://github.com/subashshrestha189/football-stats-qa/issues/6)  
   This is the first end-to-end serving artifact milestone because it produces the four supported gold views from validated silver inputs.

Why this order:

- It follows the hard dependency chain with minimal context switching.
- It gets the data contracts stable before any serving-layer code is built.
- It produces fixture-worthy artifacts early, which will make downstream API and test work much easier.

Immediate next issue after the first 5:

- [#7 Atomic gold staging, promotion, and manifest publication](https://github.com/subashshrestha189/football-stats-qa/issues/7)  
  This is the issue that turns gold generation into a trustworthy live-snapshot system.

## Milestone Checklist

### Milestone 1 — ETL Pipeline

- [ ] [#2 Seed repo configuration and alias contract](https://github.com/subashshrestha189/football-stats-qa/issues/2)
- [ ] [#3 ETL preflight check for 6 required football-data endpoints](https://github.com/subashshrestha189/football-stats-qa/issues/3)
- [ ] [#4 Bronze fetch pipeline with 6 calls, delay, and raw GCS writes](https://github.com/subashshrestha189/football-stats-qa/issues/4)
- [ ] [#5 Silver normalization and schema validation for fetched source payloads](https://github.com/subashshrestha189/football-stats-qa/issues/5)
- [ ] [#6 Build all gold views for EPL and UCL in a single ETL pass](https://github.com/subashshrestha189/football-stats-qa/issues/6)
- [ ] [#7 Atomic gold staging, promotion, and manifest publication](https://github.com/subashshrestha189/football-stats-qa/issues/7)
- [ ] [#8 GitHub Actions schedule and retry workflow for daily ETL](https://github.com/subashshrestha189/football-stats-qa/issues/8)

### Milestone 2 — Serving App Core

- [ ] [#9 Server config module with startup env validation](https://github.com/subashshrestha189/football-stats-qa/issues/9)
- [ ] [#10 Chat API rate limiting and input validation guardrail](https://github.com/subashshrestha189/football-stats-qa/issues/10)
- [ ] [#11 Session state module for clarification and one-turn competition reuse](https://github.com/subashshrestha189/football-stats-qa/issues/11)
- [ ] [#12 Classifier service with structured output and low-confidence clarify override](https://github.com/subashshrestha189/football-stats-qa/issues/12)
- [ ] [#13 Retriever service with manifest gate, GCS read, cache TTL, and empty-reason codes](https://github.com/subashshrestha189/football-stats-qa/issues/13)
- [ ] [#14 Answerer service with grounded phrasing and deterministic fallback](https://github.com/subashshrestha189/football-stats-qa/issues/14)
- [ ] [#15 Wire /api/chat end-to-end across guardrails, classification, retrieval, session state, and answer generation](https://github.com/subashshrestha189/football-stats-qa/issues/15)
- [ ] [#16 Add /api/debug endpoint with manifest and cache status behind debug key](https://github.com/subashshrestha189/football-stats-qa/issues/16)

### Milestone 3 — Frontend UI

- [ ] [#17 Build chat composer UI with client-side 300 character cap](https://github.com/subashshrestha189/football-stats-qa/issues/17)
- [ ] [#18 Implement response renderer for answered, clarify, refuse, and unavailable states](https://github.com/subashshrestha189/football-stats-qa/issues/18)
- [ ] [#19 Add citation block and assumption banner components](https://github.com/subashshrestha189/football-stats-qa/issues/19)
- [ ] [#20 Add clarification prompt bubble flow in the chat UI](https://github.com/subashshrestha189/football-stats-qa/issues/20)

### Milestone 4 — Testing

- [ ] [#21 Create unit tests for aliases, session state, slot resolution, and refusal rules](https://github.com/subashshrestha189/football-stats-qa/issues/21)
- [ ] [#22 Create contract tests for gold schema, manifest, and API response shape](https://github.com/subashshrestha189/football-stats-qa/issues/22)
- [ ] [#23 Add classifier tests for supported, ambiguous, and unsupported queries](https://github.com/subashshrestha189/football-stats-qa/issues/23)
- [ ] [#24 Add answer tests for grounding validation and fallback behavior](https://github.com/subashshrestha189/football-stats-qa/issues/24)
- [ ] [#25 Add end-to-end chat flows for answered, clarify, refuse, and unavailable states](https://github.com/subashshrestha189/football-stats-qa/issues/25)
- [ ] [#26 Add Playwright walkthrough for one answered flow and one refusal flow](https://github.com/subashshrestha189/football-stats-qa/issues/26)
