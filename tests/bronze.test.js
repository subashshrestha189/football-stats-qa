const test = require("node:test");
const assert = require("node:assert/strict");

const BRONZE_MODULE_PATH = "../src/etl/bronze.js";

function loadBronzeModule() {
  delete require.cache[require.resolve(BRONZE_MODULE_PATH)];
  return require(BRONZE_MODULE_PATH);
}

function createConfig(overrides = {}) {
  return {
    footballApiKey: "football-test",
    gcpBucketName: "football-stats-qa-prod",
    ...overrides,
  };
}

test("runBronzeFetch skips all fetches and writes when preflight failed", async () => {
  const { runBronzeFetch } = loadBronzeModule();
  let fetchCount = 0;
  let writeCount = 0;

  const result = await runBronzeFetch({
    config: createConfig(),
    snapshotDate: "2026-04-08",
    preflightResult: {
      ok: false,
      checkedEndpoints: 3,
      manifest: {
        status: "preflight_failed",
        failedEndpoint: "CL matches",
        reason: "HTTP 503",
      },
    },
    fetchImpl: async () => {
      fetchCount += 1;
      throw new Error("fetch should not be called");
    },
    storageImpl: {
      async writeJson() {
        writeCount += 1;
      },
    },
    sleepImpl: async () => {},
  });

  assert.equal(fetchCount, 0);
  assert.equal(writeCount, 0);
  assert.deepEqual(result, {
    ok: false,
    skipped: true,
    reason: "preflight_failed",
    writtenFiles: 0,
  });
});

test("runBronzeFetch fetches all 6 endpoints with 700ms delay and writes raw payloads to bronze paths", async () => {
  const { runBronzeFetch } = loadBronzeModule();
  const fetchCalls = [];
  const sleepCalls = [];
  const writes = [];

  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });

    return {
      ok: true,
      status: 200,
      async json() {
        return { source: url };
      },
    };
  };

  const storageImpl = {
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });
    },
  };

  const sleepImpl = async (milliseconds) => {
    sleepCalls.push(milliseconds);
  };

  const result = await runBronzeFetch({
    config: createConfig(),
    snapshotDate: "2026-04-08",
    preflightResult: {
      ok: true,
      checkedEndpoints: 6,
    },
    fetchImpl,
    storageImpl,
    sleepImpl,
  });

  assert.equal(fetchCalls.length, 6);
  assert.deepEqual(sleepCalls, [700, 700, 700, 700, 700]);
  assert.equal(writes.length, 6);

  assert.ok(
    writes.some(
      (write) =>
        write.bucketName === "football-stats-qa-prod" &&
        write.objectPath === "bronze/EPL/standings/2026-04-08.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "bronze/EPL/matches/2026-04-08.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "bronze/EPL/scorers/2026-04-08.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "bronze/UCL/standings/2026-04-08.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "bronze/UCL/matches/2026-04-08.json"
    )
  );
  assert.ok(
    writes.some(
      (write) =>
        write.objectPath === "bronze/UCL/scorers/2026-04-08.json"
    )
  );
  assert.ok(
    fetchCalls.every(
      (call) => call.options.headers["X-Auth-Token"] === "football-test"
    )
  );
  assert.deepEqual(result, {
    ok: true,
    writtenFiles: 6,
    snapshotDate: "2026-04-08",
    bucketName: "football-stats-qa-prod",
  });
});

test("runBronzeFetch hard fails on a non-OK fetch response before writing later files", async () => {
  const { runBronzeFetch } = loadBronzeModule();
  const writes = [];
  const sleepCalls = [];

  const fetchImpl = async (url) => {
    if (url.includes("/competitions/PL/scorers")) {
      return {
        ok: false,
        status: 502,
        async json() {
          return {};
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return { source: url };
      },
    };
  };

  const storageImpl = {
    async writeJson(bucketName, objectPath, payload) {
      writes.push({ bucketName, objectPath, payload });
    },
  };

  const sleepImpl = async (milliseconds) => {
    sleepCalls.push(milliseconds);
  };

  await assert.rejects(
    () =>
      runBronzeFetch({
        config: createConfig(),
        snapshotDate: "2026-04-08",
        preflightResult: {
          ok: true,
          checkedEndpoints: 6,
        },
        fetchImpl,
        storageImpl,
        sleepImpl,
      }),
    {
      name: "Error",
      message: "Bronze fetch failed for EPL scorers endpoint: HTTP 502",
    }
  );

  assert.equal(writes.length, 2);
  assert.deepEqual(sleepCalls, [700, 700]);
});
