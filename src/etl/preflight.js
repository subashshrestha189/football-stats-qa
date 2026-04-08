const {
  FOOTBALL_DATA_ENDPOINTS,
  buildFootballDataUrl,
} = require("../lib/football-data");

const REQUIRED_ENDPOINTS = FOOTBALL_DATA_ENDPOINTS;

async function runPreflight({ config, fetchImpl }) {
  let checkedEndpoints = 0;

  for (const endpoint of REQUIRED_ENDPOINTS) {
    const response = await fetchImpl(buildFootballDataUrl(endpoint), {
      headers: {
        "X-Auth-Token": config.footballApiKey,
      },
    });

    checkedEndpoints += 1;

    if (!response.ok) {
      return {
        ok: false,
        checkedEndpoints,
        manifest: {
          status: "preflight_failed",
          failedEndpoint: endpoint.label,
          reason: `HTTP ${response.status}`,
        },
      };
    }

    const payload = await response.json();

    const hasExpectedArray = Array.isArray(payload[endpoint.expectedKey]);
    const hasCountProbe = Number.isInteger(payload.count);

    if (!hasExpectedArray && !hasCountProbe) {
      return {
        ok: false,
        checkedEndpoints,
        manifest: {
          status: "preflight_failed",
          failedEndpoint: endpoint.label,
          reason: `missing expected ${endpoint.expectedKey} array`,
        },
      };
    }
  }

  return {
    ok: true,
    checkedEndpoints: REQUIRED_ENDPOINTS.length,
  };
}

module.exports = {
  REQUIRED_ENDPOINTS,
  runPreflight,
};
