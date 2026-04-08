const { REQUIRED_ENDPOINTS } = require("./preflight");

function deriveUclPhase(rows) {
  if (!rows || rows.length === 0) {
    return "off_season";
  }

  return "league_phase";
}

function buildStandingsPayload(silverPayload) {
  const payload = {
    schema_version: "1.0",
    snapshot_date: silverPayload.snapshot_date,
    competition: silverPayload.competition,
    intent: "standings",
    rows: silverPayload.rows,
  };

  if (silverPayload.competition === "UCL") {
    payload.ucl_phase = deriveUclPhase(silverPayload.rows);
  }

  return payload;
}

function buildMatchesPayload(silverPayload) {
  const rows = silverPayload.rows ?? [];
  const recentResults = rows.filter((row) => row.status === "FINISHED").slice(-5);
  const upcomingFixtures = rows.filter((row) => row.status === "SCHEDULED").slice(0, 5);

  return {
    schema_version: "1.0",
    snapshot_date: silverPayload.snapshot_date,
    competition: silverPayload.competition,
    intent: "matches",
    rows,
    recent_results: recentResults,
    upcoming_fixtures: upcomingFixtures,
  };
}

function buildScorersPayload(silverPayload) {
  return {
    schema_version: "1.0",
    snapshot_date: silverPayload.snapshot_date,
    competition: silverPayload.competition,
    intent: "scorers",
    rows: (silverPayload.rows ?? []).slice(0, 10),
  };
}

function buildGoldPayload(endpointType, silverPayload) {
  if (!silverPayload) {
    throw new Error("missing silver input");
  }

  if (endpointType === "standings") {
    return buildStandingsPayload(silverPayload);
  }

  if (endpointType === "matches") {
    return buildMatchesPayload(silverPayload);
  }

  return buildScorersPayload(silverPayload);
}

async function runGoldBuild({ config, snapshotDate, storageImpl }) {
  const stagedFiles = [];

  for (const endpoint of REQUIRED_ENDPOINTS) {
    const competition = endpoint.code === "PL" ? "EPL" : "UCL";
    const silverPath = `silver/${competition}/${endpoint.expectedKey}/${snapshotDate}.json`;
    const silverPayload = await storageImpl.readJson(config.gcpBucketName, silverPath);

    let goldPayload;

    try {
      goldPayload = buildGoldPayload(endpoint.expectedKey, silverPayload);
    } catch (error) {
      throw new Error(
        `Gold build failed for ${competition} ${endpoint.expectedKey} intent: ${error.message}`
      );
    }

    const stagingPath = `gold/staging/${snapshotDate}/${competition}/${endpoint.expectedKey}.json`;
    await storageImpl.writeJson(config.gcpBucketName, stagingPath, goldPayload);
    stagedFiles.push({
      competition,
      intent: endpoint.expectedKey,
      stagingPath,
      latestPath: `gold/latest/${competition}/${endpoint.expectedKey}.json`,
    });
  }

  for (const file of stagedFiles) {
    await storageImpl.copyObject(
      config.gcpBucketName,
      file.stagingPath,
      file.latestPath
    );
  }

  return {
    ok: true,
    stagedFiles: stagedFiles.length,
    promotedFiles: stagedFiles.length,
    snapshotDate,
  };
}

module.exports = {
  runGoldBuild,
};
