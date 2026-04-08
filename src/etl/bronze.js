const { REQUIRED_ENDPOINTS } = require("./preflight");
const {
  buildFootballDataUrl,
  buildBronzePath,
} = require("../lib/football-data");
const { BRONZE_FETCH_DELAY_MS } = require("../lib/app-policy");

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
    let response = await fetchImpl(buildFootballDataUrl(endpoint), {
      headers: {
        "X-Auth-Token": config.footballApiKey,
      },
    });

    if (response.status === 429) {
      await sleepImpl(65000);
      response = await fetchImpl(buildFootballDataUrl(endpoint), {
        headers: {
          "X-Auth-Token": config.footballApiKey,
        },
      });
    }

    if (!response.ok) {
      throw new Error(
        `Bronze fetch failed for ${endpoint.competition} ${endpoint.expectedKey} endpoint: HTTP ${response.status}`
      );
    }

    const payload = await response.json();
    const objectPath = buildBronzePath(endpoint, snapshotDate);

    await storageImpl.writeJson(config.gcpBucketName, objectPath, payload);
    writtenFiles += 1;

    if (index < REQUIRED_ENDPOINTS.length - 1) {
      await sleepImpl(BRONZE_FETCH_DELAY_MS);
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
