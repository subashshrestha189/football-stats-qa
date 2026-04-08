const test = require("node:test");
const assert = require("node:assert/strict");

const GOLD_MODULE_PATH = "../src/etl/gold.js";

function loadGoldModule() {
  delete require.cache[require.resolve(GOLD_MODULE_PATH)];
  return require(GOLD_MODULE_PATH);
}

function createConfig(overrides = {}) {
  return {
    gcpBucketName: "football-stats-qa-prod",
    ...overrides,
  };
}

test("runGoldBuild writes all gold staging files and promotes them when every required output succeeds", async () => {
  const { runGoldBuild } = loadGoldModule();
  const reads = [];
  const writes = [];
  const copies = [];

  const silverPayload = (competition, endpoint, rows) => ({
    schema_version: "1.0",
    snapshot_date: "2026-04-08",
    competition,
    endpoint,
    rows,
  });

  const storageImpl = {
    async readJson(bucketName, objectPath) {
      reads.push({ bucketName, objectPath });

      const payloads = {
        "silver/EPL/standings/2026-04-08.json": silverPayload("EPL", "standings", [
          {
            position: 1,
            team: "Liverpool",
            played: 30,
            won: 22,
            drawn: 5,
            lost: 3,
            points: 71,
            goalDifference: 41,
          },
        ]),
        "silver/EPL/matches/2026-04-08.json": silverPayload("EPL", "matches", [
          {
            utcDate: "2026-04-08T19:00:00Z",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            homeScore: 2,
            awayScore: 1,
            status: "FINISHED",
          },
        ]),
        "silver/EPL/scorers/2026-04-08.json": silverPayload("EPL", "scorers", [
          {
            rank: 1,
            player: "Erling Haaland",
            team: "Manchester City",
            goals: 24,
          },
        ]),
        "silver/UCL/standings/2026-04-08.json": silverPayload("UCL", "standings", [
          {
            position: 1,
            team: "Barcelona",
            played: 8,
            won: 6,
            drawn: 1,
            lost: 1,
            points: 19,
            goalDifference: 10,
          },
        ]),
        "silver/UCL/matches/2026-04-08.json": silverPayload("UCL", "matches", [
          {
            utcDate: "2026-04-08T20:00:00Z",
            homeTeam: "Real Madrid",
            awayTeam: "Bayern Munich",
            homeScore: null,
            awayScore: null,
            status: "SCHEDULED",
          },
        ]),
        "silver/UCL/scorers/2026-04-08.json": silverPayload("UCL", "scorers", [
          {
            rank: 1,
            player: "Kylian Mbappe",
            team: "Real Madrid",
            goals: 10,
          },
        ]),
      };

      return payloads[objectPath];
    },
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });
    },
    async copyObject(bucketName, fromPath, toPath) {
      copies.push({ bucketName, fromPath, toPath });
    },
  };

  const result = await runGoldBuild({
    config: createConfig(),
    snapshotDate: "2026-04-08",
    storageImpl,
  });

  assert.equal(reads.length, 6);
  assert.equal(writes.length, 7);
  assert.equal(copies.length, 6);
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "gold/staging/2026-04-08/EPL/standings.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "EPL" &&
        write.payload.intent === "standings"
    )
  );
  assert.ok(
    copies.some(
      (copy) =>
        copy.fromPath === "gold/staging/2026-04-08/EPL/standings.json" &&
        copy.toPath === "gold/latest/EPL/standings.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "gold/manifest.json" &&
        write.payload.status === "complete" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.files_written === 8
    )
  );
  assert.deepEqual(result, {
    ok: true,
    stagedFiles: 6,
    promotedFiles: 6,
    snapshotDate: "2026-04-08",
  });
});

test("runGoldBuild does not promote any gold files when a required silver input is missing", async () => {
  const { runGoldBuild } = loadGoldModule();
  const writes = [];
  const copies = [];

  const storageImpl = {
    async readJson(_bucketName, objectPath) {
      if (objectPath === "silver/UCL/scorers/2026-04-08.json") {
        return undefined;
      }

      return {
        schema_version: "1.0",
        snapshot_date: "2026-04-08",
        competition: objectPath.includes("/EPL/") ? "EPL" : "UCL",
        endpoint: objectPath.includes("/standings/")
          ? "standings"
          : objectPath.includes("/matches/")
            ? "matches"
            : "scorers",
        rows: [],
      };
    },
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });
    },
    async copyObject(bucketName, fromPath, toPath) {
      copies.push({ bucketName, fromPath, toPath });
    },
  };

  await assert.rejects(
    () =>
      runGoldBuild({
        config: createConfig(),
        snapshotDate: "2026-04-08",
        storageImpl,
      }),
    {
      name: "Error",
      message: "Gold build failed for UCL scorers intent: missing silver input"
    }
  );

  assert.equal(copies.length, 0);
  assert.ok(writes.length < 6);
});

test("runGoldBuild writes a failed manifest and does not promote when a staging write fails", async () => {
  const { runGoldBuild } = loadGoldModule();
  const writes = [];
  const copies = [];

  const storageImpl = {
    async readJson(_bucketName, objectPath) {
      return {
        schema_version: "1.0",
        snapshot_date: "2026-04-08",
        competition: objectPath.includes("/EPL/") ? "EPL" : "UCL",
        endpoint: objectPath.includes("/standings/")
          ? "standings"
          : objectPath.includes("/matches/")
            ? "matches"
            : "scorers",
        rows: [],
      };
    },
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });

      if (objectPath === "gold/staging/2026-04-08/UCL/matches.json") {
        throw new Error("storage unavailable");
      }
    },
    async copyObject(bucketName, fromPath, toPath) {
      copies.push({ bucketName, fromPath, toPath });
    },
  };

  const result = await runGoldBuild({
    config: createConfig(),
    snapshotDate: "2026-04-08",
    storageImpl,
  });

  assert.equal(copies.length, 0);
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "gold/manifest.json" &&
        write.payload.status === "failed" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.files_written === 0 &&
        write.payload.reason === "staging write failed"
    )
  );
  assert.deepEqual(result, {
    ok: false,
    stagedFiles: 4,
    promotedFiles: 0,
    snapshotDate: "2026-04-08",
    manifest: {
      status: "failed",
      snapshot_date: "2026-04-08",
      files_written: 0,
      reason: "staging write failed",
    },
  });
});
