const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";

const COMPETITION_KEYS = {
  PL: "EPL",
  CL: "UCL",
};

const FOOTBALL_DATA_ENDPOINTS = [
  {
    code: "PL",
    competition: "EPL",
    label: "PL standings",
    path: "/competitions/PL/standings",
    expectedKey: "standings",
  },
  {
    code: "PL",
    competition: "EPL",
    label: "PL matches",
    path: "/competitions/PL/matches",
    expectedKey: "matches",
  },
  {
    code: "PL",
    competition: "EPL",
    label: "PL scorers",
    path: "/competitions/PL/scorers",
    expectedKey: "scorers",
  },
  {
    code: "CL",
    competition: "UCL",
    label: "CL standings",
    path: "/competitions/CL/standings",
    expectedKey: "standings",
  },
  {
    code: "CL",
    competition: "UCL",
    label: "CL matches",
    path: "/competitions/CL/matches",
    expectedKey: "matches",
  },
  {
    code: "CL",
    competition: "UCL",
    label: "CL scorers",
    path: "/competitions/CL/scorers",
    expectedKey: "scorers",
  },
];

function buildFootballDataUrl(endpoint) {
  return `${FOOTBALL_DATA_BASE_URL}${endpoint.path}`;
}

function buildBronzePath(endpoint, snapshotDate) {
  return `bronze/${endpoint.competition}/${endpoint.expectedKey}/${snapshotDate}.json`;
}

function buildSilverPath(endpoint, snapshotDate) {
  return `silver/${endpoint.competition}/${endpoint.expectedKey}/${snapshotDate}.json`;
}

function buildGoldStagingPath(endpoint, snapshotDate) {
  return `gold/staging/${snapshotDate}/${endpoint.competition}/${endpoint.expectedKey}.json`;
}

function buildGoldLatestPath(competition, resource) {
  return `gold/latest/${competition}/${resource}.json`;
}

function getGoldResourceForIntent(intent) {
  if (intent === "standings") {
    return "standings";
  }

  if (intent === "top_scorers") {
    return "scorers";
  }

  return "matches";
}

module.exports = {
  FOOTBALL_DATA_BASE_URL,
  FOOTBALL_DATA_ENDPOINTS,
  COMPETITION_KEYS,
  buildFootballDataUrl,
  buildBronzePath,
  buildSilverPath,
  buildGoldStagingPath,
  buildGoldLatestPath,
  getGoldResourceForIntent,
};
