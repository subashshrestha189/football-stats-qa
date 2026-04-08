## Problem Statement

People who want quick, trustworthy answers about Premier League and UEFA Champions League stats often have to bounce between tables, fixture pages, and scorer lists, then manually reconcile whether those sources are current. Generic chatbots make this worse because they can answer confidently with stale, unsupported, or invented football facts. The problem is especially painful for users who want fast natural-language answers to simple factual questions like who leads the table, what the latest result was, who the top scorers are, or when a team plays next.

This project needs a football Q&A app that is narrow, auditable, and explicit about freshness. Users should be able to ask natural-language questions about a single configured season at a time, with the initial target set to the 2024/25 season in configuration, and get grounded answers only from the latest fully successful daily snapshot. The app must prefer trust over coverage: it should clarify ambiguity once, refuse unsupported questions cleanly, and never fall back to raw source calls or hallucinated reasoning.

## Solution

Build a public read-only Football Q&A app backed by a daily ETL pipeline and a deterministic retrieval layer. GitHub Actions will fetch six verified `football-data.org` endpoints once per day, store bronze, silver, and gold JSON in a private GCP bucket, and publish a new live snapshot only when all required gold artifacts succeed together. A Next.js app deployed on Vercel will serve a chat interface and a backend chat API that reads only validated gold files from GCS.

The runtime flow will use a two-step LLM pipeline with `gpt-4o-mini`: first classify the question into a strict schema with intent, slots, confidence, and at most one clarification prompt; then, after deterministic retrieval from gold data, generate final phrasing from a grounding-locked prompt. The app will support only four intents for EPL and UCL: standings, recent results, top scorers, and upcoming fixtures. Every answer will cite the competition and snapshot date. Unsupported, ambiguous, stale, or empty-window cases will be handled by deterministic clarifications or refusals rather than best-effort guesses.

## User Stories

1. As a football fan, I want to ask who is top of the Premier League, so that I can get the current table leader without browsing multiple sites.
2. As a football fan, I want to ask for the current EPL standings, so that I can see points, wins, losses, and position in one answer.
3. As a football fan, I want to ask who is top of the Champions League table during the league phase, so that I can understand the latest UCL standings quickly.
4. As a football fan, I want the app to refuse UCL standings questions during knockout rounds, so that I am not misled by a table that no longer applies.
5. As a football fan, I want to ask for a team's most recent result, so that I can catch up on what happened without scanning fixture lists.
6. As a football fan, I want match result answers to include the match date, so that I know when the reported score happened.
7. As a football fan, I want to ask for upcoming fixtures, so that I can see who plays next and when.
8. As a football fan, I want upcoming fixture answers to include both date and kickoff time, so that I can plan around the match.
9. As a football fan, I want to ask who the top scorers are in EPL or UCL, so that I can see the leading goalscorers in that competition.
10. As a football fan, I want to ask how many goals a specific player has scored in EPL or UCL, so that I can quickly check scorer totals within supported scope.
11. As a football fan, I want the app to ask which competition I mean when I omit EPL or Champions League, so that the answer stays trustworthy.
12. As a football fan, I want the app to ask which team I mean when my wording is ambiguous, so that it does not silently guess wrong.
13. As a football fan, I want one clarification question at most, so that the experience feels quick rather than interrogative.
14. As a football fan, I want the app to automatically complete my original question after I answer a clarification, so that I do not need to repeat myself.
15. As a football fan, I want the app to reuse the last competition for one same-intent follow-up turn only, so that short follow-ups feel natural without creating hidden long-term state.
16. As a football fan, I want the app to make any reused assumption visible in the answer text, so that I can spot and correct it immediately if needed.
17. As a football fan, I want every answer to show the snapshot date, so that I know how fresh the data is.
18. As a football fan, I want the app to answer only from the latest fully successful daily snapshot, so that I do not get mixed data ages in the same session.
19. As a football fan, I want the app to refuse delta questions like "who moved up since yesterday," so that it does not pretend to track change history it does not support.
20. As a football fan, I want the app to refuse historical season questions, so that I understand this MVP only covers one configured season at a time.
21. As a football fan, I want the app to refuse live-score requests, so that I do not mistake daily snapshots for real-time coverage.
22. As a football fan, I want the app to refuse unsupported player data like assists, injuries, or squad membership, so that I know the product boundary clearly.
23. As a football fan, I want the app to refuse bracket or progression questions for Champions League knockouts, so that it does not imply support for data structures it does not have.
24. As a football fan, I want the app to refuse when a player is not present in the current top scorers payload, so that it never fabricates a zero-goal answer.
25. As a football fan, I want the app to refuse when a team is outside the current results or fixtures window, so that it does not infer facts from missing rows.
26. As a football fan, I want completed answers to be phrased naturally, so that the experience feels conversational rather than like raw JSON.
27. As a football fan, I want the app to avoid adding any fact not present in the payload, so that natural phrasing does not come at the cost of hallucinations.
28. As a football fan, I want the app to fall back to a plain deterministic answer if the LLM phrasing call fails, so that a successful retrieval still yields a useful response.
29. As a football fan, I want a simple "please try again shortly" response when I hit rate limits, so that the app stays predictable without exposing internal quotas.
30. As a football fan, I want my questions not to be stored verbatim in persistent logs, so that I can use the app without unnecessary privacy concerns.
31. As a developer, I want one configured season setting for the app, so that the same architecture can be reused next season without redesigning the product.
32. As a developer, I want the ETL pipeline to store bronze raw responses by endpoint and date, so that I can audit and replay transformations when needed.
33. As a developer, I want silver and gold artifacts to be schema-validated, so that bad source payloads do not silently propagate into answers.
34. As a developer, I want a preflight capability check before the ETL fetches any data, so that unsupported or broken endpoints fail loudly before partial writes begin.
35. As a developer, I want all eight gold outputs to succeed before promotion, so that serving remains atomic and consistent across competitions and intents.
36. As a developer, I want a manifest that marks the latest successful snapshot, so that the serving app can reliably decide what data is safe to use.
37. As a developer, I want a deterministic alias map for competition and team names, so that entity resolution is transparent, testable, and easy to update.
38. As a developer, I want retrieval to read only gold files, so that runtime logic stays small, fast, and auditable.
39. As a developer, I want the classification output to use a strict schema, so that app code can enforce clarify-versus-answer behavior without guessing.
40. As a developer, I want low-confidence classification to default to clarification, so that ambiguous inputs fail safely.
41. As a developer, I want the backend to own all refusal, clarification, and answer copy, so that UI rendering stays simple and consistent.
42. As a developer, I want a server-only config module that validates all required env vars at startup, so that misconfiguration fails fast before production traffic arrives.
43. As a developer, I want the app to cache gold payloads briefly in memory, so that repeated reads stay fast without sacrificing freshness.
44. As a developer, I want a debug endpoint with manifest and cache status, so that I can diagnose stale data or cache issues without inspecting production internals manually.
45. As a developer, I want contract, classifier, answer, and e2e tests to block deploys, so that trust regressions are caught before users see them.

## Implementation Decisions

- The product supports one configured season at a time, with the initial target set to `2024/25` in configuration rather than hardcoded into business logic.
- Supported competitions are limited to Premier League and UEFA Champions League.
- Supported user intents are limited to standings, recent results, top scorers, and upcoming fixtures.
- All answers are grounded in the latest fully successful daily snapshot only.
- Historical data, delta queries, live scores, and multi-snapshot comparisons are intentionally excluded from MVP behavior.
- The ETL pipeline performs a preflight capability check against the six required source endpoints before fetching any data.
- Daily ingestion runs on GitHub Actions at midnight UTC with one automatic retry at 06:00 UTC if the first run fails.
- Bronze stores the raw source payload per endpoint per date for auditability and replay.
- Silver normalizes source payloads into stable internal structures before gold shaping.
- Gold is the only runtime retrieval source for the app.
- Gold artifacts are versioned, schema-validated JSON files with precomputed display fields.
- Gold is organized as one file per intent and snapshot date, with both competitions contained in a competition-keyed structure.
- The serving contract is atomic: all four intents for both competitions must succeed before a new live snapshot is promoted.
- A manifest controls which snapshot is safe to serve and prevents partial or mixed-date publication.
- Champions League standings are supported only during the league phase.
- The UCL gold contract includes an explicit phase field so the app can deterministically refuse standings questions during knockouts or off-season.
- Team and competition matching use a static repository-managed alias map rather than fuzzy matching.
- Ambiguous competition or team references trigger one clarification question rather than a silent default.
- Unsupported questions receive hard refusals with guided redirection to supported intents where appropriate.
- The runtime uses a two-step LLM flow: structured classification first, grounded phrasing second.
- The classification step returns only structured fields such as intent, slots, confidence, and an optional single clarification prompt.
- Application code, not the model, decides whether a request is answered, clarified, refused, or marked unavailable.
- Low-confidence classification is overridden to clarification before retrieval is attempted.
- Retrieval is deterministic and bounded to the relevant gold payload for the resolved competition and intent.
- The final answer is phrased by `gpt-4o-mini` from a tightly constrained prompt that allows only grounded wording from the retrieved payload.
- If answer phrasing fails or violates grounding checks, the backend returns a deterministic non-LLM fallback answer.
- Session state is minimal and limited to one pending clarification plus one-turn competition reuse for same-intent follow-ups.
- Session state is cleared aggressively after answers or refusals to reduce stale-context errors.
- The backend API returns structured status, answer text, citation metadata, refusal codes, resolved intent, resolved competition, snapshot date, and assumption metadata.
- The frontend is a thin renderer and does not construct football-domain copy or business logic.
- The app is deployed on Vercel and reads from a private GCS bucket using a read-only service account credential stored in server-side environment variables.
- The ETL writer and app reader use separate GCP service accounts with least-privilege access.
- The bucket remains private with no public object access and no signed URL serving.
- A server-only configuration module validates required environment variables during cold start and hard-fails if configuration is incomplete.
- Runtime gold payloads are cached in memory for five minutes to reduce GCS reads while keeping freshness near the live manifest.
- The public chat API is protected by basic IP-based rate limiting and a hard input length cap of 300 characters.
- Persistent logs capture structured outcome metadata only and never store raw user questions or rejected model output text.
- A lightweight debug endpoint exposes manifest and cache state behind a secret header for operational troubleshooting.
- Empty retrievals are converted into deterministic refusal codes such as unsupported competition phase or not present in the current window, rather than being handed back to the model for improvisation.
- The product uses Europe/London as the fixed display timezone for user-facing dates and kickoff times, while raw ingestion remains UTC-based.

## Testing Decisions

- Good tests should validate externally observable behavior and stable contracts rather than implementation details or prompt phrasing internals.
- Contract tests should verify gold schema validity, manifest shape, API response shape, and refusal/clarification payload structure.
- Unit tests should cover alias resolution, clarification state handling, one-turn competition reuse, refusal mapping, and config validation behavior.
- Classifier tests should cover supported, ambiguous, unsupported, and low-confidence inputs using mocked model responses.
- Answer tests should verify grounding enforcement, citation presence, and deterministic fallback behavior when model output is invalid or unavailable.
- End-to-end tests should cover at least one successful flow for each supported intent plus clarify, refuse, and unavailable scenarios.
- Automated CI should use checked-in fixture data and mocked LLM responses so test runs do not depend on live GCS, live `football-data.org`, or live model APIs.
- Real model calls are reserved for manual smoke testing rather than automated test pipelines.
- CI should block deployment on failures in lint, unit, contract, classifier, answer, or end-to-end stages.
- Tests should prefer fixture-driven gold payloads that mirror production schemas exactly, so the serving layer is exercised against realistic data without introducing network flakiness.

## Out of Scope

- Historical seasons and arbitrary season selection by the user.
- More than one configured season served at the same time.
- Competitions beyond EPL and UEFA Champions League.
- Live scores, minute-by-minute updates, or in-match state.
- Delta or trend analysis across days or matchdays.
- Historical comparisons between snapshots.
- Player data beyond goal totals in the top scorers payload.
- General player lookup, squad lookup, or positional information.
- Transfer news, injuries, cards, assists, minutes, or non-goal player metrics.
- Champions League bracket, progression, or knockout-tree answers.
- Per-user accounts, authentication, personalization, or saved history.
- Free-form analytics, predictive insights, or betting-style recommendations.
- Public direct access to bucket objects or client-side data fetching from GCS.

## Further Notes

- The MVP should be treated as a trust-first factual assistant rather than a general football chatbot.
- Product language should consistently reinforce the supported scope so users learn the boundaries quickly.
- Season configuration should remain a top-level operational setting so the same system can roll forward to a new season with minimal code changes.
- The atomic snapshot rule is one of the core product guarantees and should not be weakened for convenience.
- Prompt design should be considered part of the contract surface, but the durable guarantees should live in validation and deterministic backend logic rather than model obedience alone.
