const { REQUIRED_ENDPOINTS } = require("./preflight");
const {
  buildSilverPath,
  buildGoldLatestPath,
  buildGoldStagingPath,
} = require("../lib/football-data");

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
    const competition = endpoint.competition;
    const silverPath = buildSilverPath(endpoint, snapshotDate);
    const silverPayload = await storageImpl.readJson(config.gcpBucketName, silverPath);

    let goldPayload;

    try {
      goldPayload = buildGoldPayload(endpoint.expectedKey, silverPayload);
    } catch (error) {
      throw new Error(
        `Gold build failed for ${competition} ${endpoint.expectedKey} intent: ${error.message}`
      );
    }

    const stagingPath = buildGoldStagingPath(endpoint, snapshotDate);
    try {
      await storageImpl.writeJson(config.gcpBucketName, stagingPath, goldPayload);
    } catch (_error) {
      const manifest = {
        status: "failed",
        snapshot_date: snapshotDate,
        files_written: 0,
        reason: "staging write failed",
      };

      await storageImpl.writeJson(config.gcpBucketName, "gold/manifest.json", manifest);

      return {
        ok: false,
        stagedFiles: stagedFiles.length,
        promotedFiles: 0,
        snapshotDate,
        manifest,
      };
    }

    stagedFiles.push({
      competition,
      intent: endpoint.expectedKey,
      stagingPath,
      latestPath: buildGoldLatestPath(competition, endpoint.expectedKey),
    });
  }

  for (const file of stagedFiles) {
    await storageImpl.copyObject(
      config.gcpBucketName,
      file.stagingPath,
      file.latestPath
    );
  }

  await storageImpl.writeJson(config.gcpBucketName, "gold/manifest.json", {
    status: "complete",
    snapshot_date: snapshotDate,
    files_written: 8,
  });

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
