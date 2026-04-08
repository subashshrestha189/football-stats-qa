const BASE_URL = "https://api.football-data.org/v4";

const REQUIRED_ENDPOINTS = [
  {
    code: "PL",
    label: "PL standings",
    path: "/competitions/PL/standings",
  },
  {
    code: "PL",
    label: "PL matches",
    path: "/competitions/PL/matches",
  },
  {
    code: "PL",
    label: "PL scorers",
    path: "/competitions/PL/scorers",
  },
  {
    code: "CL",
    label: "CL standings",
    path: "/competitions/CL/standings",
  },
  {
    code: "CL",
    label: "CL matches",
    path: "/competitions/CL/matches",
  },
  {
    code: "CL",
    label: "CL scorers",
    path: "/competitions/CL/scorers",
  },
];

async function runPreflight({ config, fetchImpl }) {
  for (const endpoint of REQUIRED_ENDPOINTS) {
    const response = await fetchImpl(`${BASE_URL}${endpoint.path}`, {
      headers: {
        "X-Auth-Token": config.footballApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Preflight failed for ${endpoint.label} endpoint: HTTP ${response.status}`
      );
    }

    await response.json();
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
