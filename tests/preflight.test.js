const test = require("node:test");
const assert = require("node:assert/strict");

const PREFLIGHT_MODULE_PATH = "../src/etl/preflight.js";

function loadPreflightModule() {
  delete require.cache[require.resolve(PREFLIGHT_MODULE_PATH)];
  return require(PREFLIGHT_MODULE_PATH);
}

function createConfig(overrides = {}) {
  return {
    footballApiKey: "football-test",
    season: "2024/25",
    ...overrides,
  };
}

test("runPreflight validates all 6 required football-data endpoints before ETL starts", async () => {
  const { runPreflight } = loadPreflightModule();
  const fetchCalls = [];

  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });

    return {
      ok: true,
      status: 200,
      async json() {
        return { count: 1 };
      },
    };
  };

  const result = await runPreflight({
    config: createConfig(),
    fetchImpl,
  });

  assert.equal(fetchCalls.length, 6);
  assert.deepEqual(result, {
    ok: true,
    checkedEndpoints: 6,
  });
  assert.ok(fetchCalls.every((call) => call.options.headers["X-Auth-Token"] === "football-test"));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/PL/standings")));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/PL/matches")));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/PL/scorers")));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/CL/standings")));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/CL/matches")));
  assert.ok(fetchCalls.some((call) => call.url.includes("/competitions/CL/scorers")));
});

test("runPreflight throws a clear error and stops when any required endpoint is unavailable", async () => {
  const { runPreflight } = loadPreflightModule();
  const fetchCalls = [];

  const fetchImpl = async (url) => {
    fetchCalls.push(url);

    if (url.includes("/competitions/CL/scorers")) {
      return {
        ok: false,
        status: 503,
        async json() {
          return {};
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return { count: 1 };
      },
    };
  };

  await assert.rejects(
    () =>
      runPreflight({
        config: createConfig(),
        fetchImpl,
      }),
    {
      name: "Error",
      message: "Preflight failed for CL scorers endpoint: HTTP 503",
    }
  );

  assert.equal(fetchCalls.length, 6);
});
