const test = require("node:test");
const assert = require("node:assert/strict");

const RETRIEVER_MODULE_PATH = "../src/lib/retriever-service.js";

function loadRetrieverModule() {
  delete require.cache[require.resolve(RETRIEVER_MODULE_PATH)];
  return require(RETRIEVER_MODULE_PATH);
}

function createConfig(overrides = {}) {
  return {
    gcpBucketName: "football-stats-qa-prod",
    ...overrides,
  };
}

test("retriever reads manifest first and returns unavailable when the latest snapshot is not complete", async () => {
  const { createRetrieverService } = loadRetrieverModule();
  const reads = [];
  const service = createRetrieverService({
    config: createConfig(),
    storageImpl: {
      async readJson(bucketName, objectPath) {
        reads.push({ bucketName, objectPath });

        return {
          status: "failed",
          snapshot_date: "2026-04-08",
          files_written: 0,
          reason: "staging write failed",
        };
      },
    },
    nowProvider: () => new Date("2026-04-08T12:00:00Z"),
  });

  const result = await service.retrieve({
    competition: "EPL",
    intent: "standings",
  });

  assert.deepEqual(result, {
    type: "unavailable",
    emptyReason: "data_unavailable",
    snapshotDate: "2026-04-08",
  });
  assert.deepEqual(reads, [
    {
      bucketName: "football-stats-qa-prod",
      objectPath: "gold/manifest.json",
    },
  ]);
});

test("retriever reads and caches latest gold data and maps recent_results to the matches payload", async () => {
  const { createRetrieverService } = loadRetrieverModule();
  let readCount = 0;
  const service = createRetrieverService({
    config: createConfig(),
    storageImpl: {
      async readJson(_bucketName, objectPath) {
        readCount += 1;

        if (objectPath === "gold/manifest.json") {
          return {
            status: "complete",
            snapshot_date: "2026-04-08",
            files_written: 8,
          };
        }

        return {
          schema_version: "1.0",
          snapshot_date: "2026-04-08",
          competition: "EPL",
          intent: "matches",
          recent_results: [
            {
              utcDate: "2026-04-08T19:00:00Z",
              homeTeam: "Arsenal",
              awayTeam: "Chelsea",
              homeScore: 2,
              awayScore: 1,
              status: "FINISHED",
            },
          ],
          upcoming_fixtures: [],
          rows: [],
        };
      },
    },
    nowProvider: () => new Date("2026-04-08T12:00:00Z"),
  });

  const first = await service.retrieve({
    competition: "EPL",
    intent: "recent_results",
  });
  const second = await service.retrieve({
    competition: "EPL",
    intent: "recent_results",
  });

  assert.deepEqual(first, {
    type: "answer",
    competition: "EPL",
    intent: "recent_results",
    snapshotDate: "2026-04-08",
    data: [
      {
        utcDate: "2026-04-08T19:00:00Z",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        homeScore: 2,
        awayScore: 1,
        status: "FINISHED",
      },
    ],
  });
  assert.deepEqual(second, first);
  assert.equal(readCount, 2);
});

test("retriever returns a deterministic empty reason for UCL standings outside league phase", async () => {
  const { createRetrieverService } = loadRetrieverModule();
  const service = createRetrieverService({
    config: createConfig(),
    storageImpl: {
      async readJson(_bucketName, objectPath) {
        if (objectPath === "gold/manifest.json") {
          return {
            status: "complete",
            snapshot_date: "2026-04-08",
            files_written: 8,
          };
        }

        return {
          schema_version: "1.0",
          snapshot_date: "2026-04-08",
          competition: "UCL",
          intent: "standings",
          ucl_phase: "knockouts",
          rows: [],
        };
      },
    },
    nowProvider: () => new Date("2026-04-08T12:00:00Z"),
  });

  const result = await service.retrieve({
    competition: "UCL",
    intent: "standings",
  });

  assert.deepEqual(result, {
    type: "empty",
    emptyReason: "competition_phase_unsupported",
    snapshotDate: "2026-04-08",
  });
});
