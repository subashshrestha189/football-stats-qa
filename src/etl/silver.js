const { REQUIRED_ENDPOINTS } = require("./preflight");
const { buildBronzePath, buildSilverPath } = require("../lib/football-data");

const REQUIRED_FIELDS = {
  standings: [
    "position",
    "team",
    "played",
    "won",
    "drawn",
    "lost",
    "points",
    "goalDifference",
  ],
  matches: [
    "utcDate",
    "homeTeam",
    "awayTeam",
    "homeScore",
    "awayScore",
    "status",
  ],
  scorers: ["rank", "player", "team", "goals"],
};

function normalizeStandingsRows(payload) {
  const tables = payload.standings ?? [];
  const rows = [];

  for (const standingGroup of tables) {
    for (const row of standingGroup.table ?? []) {
      rows.push({
        position: row.position,
        team: row.team?.name,
        played: row.playedGames,
        won: row.won,
        drawn: row.draw,
        lost: row.lost,
        points: row.points,
        goalDifference: row.goalDifference,
      });
    }
  }

  return rows;
}

function extractTeamName(team) {
  if (typeof team === "string") return team;
  return team?.name ?? team?.shortName ?? null;
}

function normalizeMatchRows(payload) {
  return (payload.matches ?? []).map((row) => ({
    utcDate: row.utcDate,
    homeTeam: extractTeamName(row.homeTeam),
    awayTeam: extractTeamName(row.awayTeam),
    homeScore: row.score?.fullTime?.home ?? null,
    awayScore: row.score?.fullTime?.away ?? null,
    status: row.status,
  }));
}

function normalizeScorerRows(payload) {
  return (payload.scorers ?? []).map((row, index) => ({
    rank: index + 1,
    player: row.player?.name,
    team: row.team?.name,
    goals: row.goals,
  }));
}

function normalizePayload(endpointType, payload) {
  if (endpointType === "standings") {
    return normalizeStandingsRows(payload);
  }

  if (endpointType === "matches") {
    return normalizeMatchRows(payload);
  }

  return normalizeScorerRows(payload);
}

function validateRows(endpointType, rows, endpointLabel) {
  for (const row of rows) {
    for (const field of REQUIRED_FIELDS[endpointType]) {
      const isMissing =
        row[field] === undefined ||
        row[field] === "" ||
        (row[field] === null &&
          !(endpointType === "matches" &&
            (field === "homeScore" || field === "awayScore")));

      if (isMissing) {
        throw new Error(
          `Silver normalization failed for ${endpointLabel} endpoint: missing required field ${field}`
        );
      }
    }
  }
}

async function runSilverNormalization({ config, snapshotDate, storageImpl, skippedEndpoints = [] }) {
  let writtenFiles = 0;

  for (const endpoint of REQUIRED_ENDPOINTS) {
    if (skippedEndpoints.includes(endpoint.label)) {
      continue;
    }

    const competition = endpoint.competition;
    const bronzePath = buildBronzePath(endpoint, snapshotDate);
    const payload = await storageImpl.readJson(config.gcpBucketName, bronzePath);
    const rows = normalizePayload(endpoint.expectedKey, payload);

    validateRows(endpoint.expectedKey, rows, `${competition} ${endpoint.expectedKey}`);

    const silverPath = buildSilverPath(endpoint, snapshotDate);
    await storageImpl.writeJson(config.gcpBucketName, silverPath, {
      schema_version: "1.0",
      snapshot_date: snapshotDate,
      competition,
      endpoint: endpoint.expectedKey,
      rows,
    });
    writtenFiles += 1;
  }

  return {
    ok: true,
    writtenFiles,
    snapshotDate,
    bucketName: config.gcpBucketName,
  };
}

module.exports = {
  runSilverNormalization,
};
