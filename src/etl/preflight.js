const BASE_URL = "https://api.football-data.org/v4";

const REQUIRED_ENDPOINTS = [
  {
    code: "PL",
    label: "PL standings",
    path: "/competitions/PL/standings",
    expectedKey: "standings",
  },
  {
    code: "PL",
    label: "PL matches",
    path: "/competitions/PL/matches",
    expectedKey: "matches",
  },
  {
    code: "PL",
    label: "PL scorers",
    path: "/competitions/PL/scorers",
    expectedKey: "scorers",
  },
  {
    code: "CL",
    label: "CL standings",
    path: "/competitions/CL/standings",
    expectedKey: "standings",
  },
  {
    code: "CL",
    label: "CL matches",
    path: "/competitions/CL/matches",
    expectedKey: "matches",
  },
  {
    code: "CL",
    label: "CL scorers",
    path: "/competitions/CL/scorers",
    expectedKey: "scorers",
  },
];

async function runPreflight({ config, fetchImpl }) {
  let checkedEndpoints = 0;

  for (const endpoint of REQUIRED_ENDPOINTS) {
    const response = await fetchImpl(`${BASE_URL}${endpoint.path}`, {
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
