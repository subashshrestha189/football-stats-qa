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

test("runPreflight returns a manifest-style failure summary when any required endpoint is unavailable", async () => {
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

  const result = await runPreflight({
    config: createConfig(),
    fetchImpl,
  });

  assert.equal(fetchCalls.length, 6);
  assert.deepEqual(result, {
    ok: false,
    checkedEndpoints: 6,
    manifest: {
      status: "preflight_failed",
      failedEndpoint: "CL scorers",
      reason: "HTTP 503",
    },
  });
});

test("runPreflight returns a manifest-style failure summary when an endpoint responds with an unexpected schema shape", async () => {
  const { runPreflight } = loadPreflightModule();

  const fetchImpl = async (url) => {
    if (url.includes("/competitions/PL/standings")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { competition: { code: "PL" } };
        },
      };
    }

    if (url.includes("/standings")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { standings: [] };
        },
      };
    }

    if (url.includes("/matches")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { matches: [] };
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return { scorers: [] };
      },
    };
  };

  const result = await runPreflight({
    config: createConfig(),
    fetchImpl,
  });

  assert.deepEqual(result, {
    ok: false,
    checkedEndpoints: 1,
    manifest: {
      status: "preflight_failed",
      failedEndpoint: "PL standings",
      reason: "missing expected standings array",
    },
  });
});
