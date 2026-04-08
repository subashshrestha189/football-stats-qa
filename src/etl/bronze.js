const { REQUIRED_ENDPOINTS } = require("./preflight");

const BASE_URL = "https://api.football-data.org/v4";

const COMPETITION_CODES = {
  PL: "EPL",
  CL: "UCL",
};

async function runBronzeFetch({
  config,
  snapshotDate,
  preflightResult,
  fetchImpl,
  storageImpl,
  sleepImpl,
}) {
  if (!preflightResult.ok) {
    return {
      ok: false,
      skipped: true,
      reason: preflightResult.manifest.status,
      writtenFiles: 0,
    };
  }

  let writtenFiles = 0;

  for (let index = 0; index < REQUIRED_ENDPOINTS.length; index += 1) {
    const endpoint = REQUIRED_ENDPOINTS[index];
    const response = await fetchImpl(`${BASE_URL}${endpoint.path}`, {
      headers: {
        "X-Auth-Token": config.footballApiKey,
      },
    });
    const payload = await response.json();
    const objectPath = `bronze/${COMPETITION_CODES[endpoint.code]}/${endpoint.expectedKey}/${snapshotDate}.json`;

    await storageImpl.writeJson(config.gcpBucketName, objectPath, payload);
    writtenFiles += 1;

    if (index < REQUIRED_ENDPOINTS.length - 1) {
      await sleepImpl(700);
    }
  }

  return {
    ok: true,
    writtenFiles,
    snapshotDate,
    bucketName: config.gcpBucketName,
  };
}

module.exports = {
  runBronzeFetch,
};
