const test = require("node:test");
const assert = require("node:assert/strict");

const SILVER_MODULE_PATH = "../src/etl/silver.js";

function loadSilverModule() {
  delete require.cache[require.resolve(SILVER_MODULE_PATH)];
  return require(SILVER_MODULE_PATH);
}

function createConfig(overrides = {}) {
  return {
    gcpBucketName: "football-stats-qa-prod",
    ...overrides,
  };
}

test("runSilverNormalization reads all 6 bronze files, normalizes them, and writes silver outputs", async () => {
  const { runSilverNormalization } = loadSilverModule();
  const reads = [];
  const writes = [];

  const bronzePayloads = {
    "bronze/EPL/standings/2026-04-08.json": {
      standings: [
        {
          table: [
            {
              position: 1,
              team: { name: "Liverpool" },
              playedGames: 30,
              won: 22,
              draw: 5,
              lost: 3,
              points: 71,
              goalDifference: 41
            }
          ]
        }
      ]
    },
    "bronze/EPL/matches/2026-04-08.json": {
      matches: [
        {
          utcDate: "2026-04-08T19:00:00Z",
          status: "FINISHED",
          homeTeam: { name: "Arsenal" },
          awayTeam: { name: "Chelsea" },
          score: {
            fullTime: {
              home: 2,
              away: 1
            }
          }
        }
      ]
    },
    "bronze/EPL/scorers/2026-04-08.json": {
      scorers: [
        {
          player: { name: "Erling Haaland" },
          team: { name: "Manchester City" },
          goals: 24
        }
      ]
    },
    "bronze/UCL/standings/2026-04-08.json": {
      standings: [
        {
          table: [
            {
              position: 1,
              team: { name: "Barcelona" },
              playedGames: 8,
              won: 6,
              draw: 1,
              lost: 1,
              points: 19,
              goalDifference: 10
            }
          ]
        }
      ]
    },
    "bronze/UCL/matches/2026-04-08.json": {
      matches: [
        {
          utcDate: "2026-04-08T20:00:00Z",
          status: "SCHEDULED",
          homeTeam: { name: "Real Madrid" },
          awayTeam: { name: "Bayern Munich" },
          score: {
            fullTime: {
              home: null,
              away: null
            }
          }
        }
      ]
    },
    "bronze/UCL/scorers/2026-04-08.json": {
      scorers: [
        {
          player: { name: "Kylian Mbappe" },
          team: { name: "Real Madrid" },
          goals: 10
        }
      ]
    }
  };

  const storageImpl = {
    async readJson(bucketName, objectPath) {
      reads.push({ bucketName, objectPath });
      return bronzePayloads[objectPath];
    },
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });
    }
  };

  const result = await runSilverNormalization({
    config: createConfig(),
    snapshotDate: "2026-04-08",
    storageImpl
  });

  assert.equal(reads.length, 6);
  assert.equal(writes.length, 6);
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/EPL/standings/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "EPL" &&
        write.payload.endpoint === "standings" &&
        Array.isArray(write.payload.rows) &&
        write.payload.rows[0].goalDifference === 41
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/EPL/matches/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "EPL" &&
        write.payload.endpoint === "matches" &&
        write.payload.rows[0].homeScore === 2 &&
        write.payload.rows[0].status === "FINISHED"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/EPL/scorers/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "EPL" &&
        write.payload.endpoint === "scorers" &&
        write.payload.rows[0].rank === 1 &&
        write.payload.rows[0].goals === 24
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/UCL/standings/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "UCL" &&
        write.payload.endpoint === "standings"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/UCL/matches/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "UCL" &&
        write.payload.endpoint === "matches"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "silver/UCL/scorers/2026-04-08.json" &&
        write.payload.schema_version === "1.0" &&
        write.payload.snapshot_date === "2026-04-08" &&
        write.payload.competition === "UCL" &&
        write.payload.endpoint === "scorers"
    )
  );
  assert.deepEqual(result, {
    ok: true,
    writtenFiles: 6,
    snapshotDate: "2026-04-08",
    bucketName: "football-stats-qa-prod"
  });
});

test("runSilverNormalization hard fails when a required normalized field is missing", async () => {
  const { runSilverNormalization } = loadSilverModule();

  const storageImpl = {
    async readJson(_bucketName, objectPath) {
      if (objectPath === "bronze/EPL/standings/2026-04-08.json") {
        return {
          standings: [
            {
              table: [
                {
                  position: 1,
                  team: {},
                  playedGames: 30,
                  won: 22,
                  draw: 5,
                  lost: 3,
                  points: 71,
                  goalDifference: 41
                }
              ]
            }
          ]
        };
      }

      if (objectPath.includes("/standings/")) {
        return {
          standings: [{ table: [] }]
        };
      }

      if (objectPath.includes("/matches/")) {
        return {
          matches: []
        };
      }

      return {
        scorers: []
      };
    },
    async writeJson() {
      throw new Error("writeJson should not be called after normalization failure");
    }
  };

  await assert.rejects(
    () =>
      runSilverNormalization({
        config: createConfig(),
        snapshotDate: "2026-04-08",
        storageImpl
      }),
    {
      name: "Error",
      message: "Silver normalization failed for EPL standings endpoint: missing required field team"
    }
  );
});
