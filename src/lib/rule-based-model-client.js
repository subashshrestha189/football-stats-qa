// Competition keywords
const EPL_PATTERNS = /\b(epl|premier league|english premier|prem)\b/i;
const UCL_PATTERNS = /\b(ucl|champions league|champions)\b/i;

// Intent keywords
const INTENT_PATTERNS = {
  standings: /\b(stand|table|top of|position|rank|points|leader|first place|who is top|who's top|leaderboard)\b/i,
  top_scorers: /\b(scorers?|scoring|top scorer|most goals|golden boot|goals? leader|who has (the most|scored)|leading (scorer|goals)|in goals)\b/i,
  recent_results: /\b(result|recent|last (game|match|week)|played|score was|beat|beaten|won|lost|defeated|latest match)\b/i,
  upcoming_fixtures: /\b(fixture|upcoming|next (game|match|week)|schedule|when (do|does|is)|playing next|coming up)\b/i,
};

// Topics this app cannot answer
const OUT_OF_SCOPE = /\b(assists?|injur|transfer|wage|salary|age|height|weight|red card|yellow card|suspend|ban|manag|coach|owner|fan|ticket|history|all.time|career|nation)\b/i;

function detectCompetition(text) {
  if (EPL_PATTERNS.test(text)) return "EPL";
  if (UCL_PATTERNS.test(text)) return "UCL";
  return null;
}

function detectIntent(text) {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(text)) return intent;
  }
  return null;
}

function formatDate(utcDate) {
  if (!utcDate) return null;
  return utcDate.slice(0, 10);
}

function buildStandingsAnswer(competition, data, snapshotDate) {
  const rows = (data ?? []).slice(0, 5);
  if (rows.length === 0) return `No standings data available for ${competition}. Data as of ${snapshotDate}.`;
  const lines = rows.map((r) => `${r.position}. ${r.team} — ${r.points} pts (W${r.won} D${r.drawn} L${r.lost})`);
  return `${competition} standings (top ${rows.length}):\n${lines.join("\n")}\nData as of ${snapshotDate}.`;
}

function buildTopScorersAnswer(competition, data, snapshotDate) {
  const rows = (data ?? []).slice(0, 5);
  if (rows.length === 0) return `No scorer data available for ${competition}. Data as of ${snapshotDate}.`;
  const lines = rows.map((r) => `${r.rank}. ${r.player} (${r.team}) — ${r.goals} goals`);
  return `${competition} top scorers:\n${lines.join("\n")}\nData as of ${snapshotDate}.`;
}

function buildRecentResultsAnswer(competition, data, snapshotDate) {
  const rows = (data ?? []).slice(-5);
  if (rows.length === 0) return `No recent results available for ${competition}. Data as of ${snapshotDate}.`;
  const lines = rows.map((r) => `${r.homeTeam} ${r.homeScore ?? "?"}-${r.awayScore ?? "?"} ${r.awayTeam}`);
  return `Recent ${competition} results:\n${lines.join("\n")}\nData as of ${snapshotDate}.`;
}

function buildUpcomingFixturesAnswer(competition, data, snapshotDate) {
  const rows = (data ?? []).slice(0, 5);
  if (rows.length === 0) return `No upcoming fixtures available for ${competition}. Data as of ${snapshotDate}.`;
  const lines = rows.map((r) => `${r.homeTeam} vs ${r.awayTeam}${r.utcDate ? ` — ${formatDate(r.utcDate)}` : ""}`);
  return `Upcoming ${competition} fixtures:\n${lines.join("\n")}\nData as of ${snapshotDate}.`;
}

function createRuleBasedModelClient() {
  function classify({ input }) {
    if (OUT_OF_SCOPE.test(input)) {
      return {
        intent: "refuse",
        competition: null,
        confidence: "high",
        clarification_prompt: null,
        refusal_code: "unsupported_scope",
        refusal_message:
          "That topic is outside this app's scope. I can answer questions about standings, top scorers, recent results, and upcoming fixtures for the EPL and Champions League.",
      };
    }

    const competition = detectCompetition(input);
    const intent = detectIntent(input);

    if (!intent) {
      return {
        intent: null,
        competition,
        confidence: "low",
        clarification_prompt:
          "I can help with standings, top scorers, recent results, or upcoming fixtures. Which would you like to know about?",
      };
    }

    if (!competition) {
      return {
        intent,
        competition: null,
        confidence: "low",
        clarification_prompt:
          "Which competition are you asking about — the Premier League (EPL) or Champions League (UCL)?",
      };
    }

    return {
      intent,
      competition,
      confidence: "high",
      clarification_prompt: null,
    };
  }

  function answer({ competition, intent, snapshotDate, data }) {
    if (intent === "standings") return buildStandingsAnswer(competition, data, snapshotDate);
    if (intent === "top_scorers") return buildTopScorersAnswer(competition, data, snapshotDate);
    if (intent === "recent_results") return buildRecentResultsAnswer(competition, data, snapshotDate);
    if (intent === "upcoming_fixtures") return buildUpcomingFixturesAnswer(competition, data, snapshotDate);
    return `Data as of ${snapshotDate}.`;
  }

  return { classify, answer };
}

module.exports = { createRuleBasedModelClient };
