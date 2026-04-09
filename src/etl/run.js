const { runPreflight } = require("./preflight");
const { runBronzeFetch } = require("./bronze");
const { runSilverNormalization } = require("./silver");
const { runGoldBuild } = require("./gold");
const { createGcsEtlStorage } = require("./gcs-etl-storage");
const { loadEtlConfig } = require("../lib/config");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = loadEtlConfig();
  const storageImpl = createGcsEtlStorage({ serviceAccountKey: config.gcpServiceAccountKey });
  const fetchImpl = globalThis.fetch.bind(globalThis);
  const snapshotDate = new Date().toISOString().slice(0, 10);

  console.log(`ETL started — snapshot date: ${snapshotDate}`);

  // Preflight
  console.log("Running preflight...");
  const preflightResult = await runPreflight({ config, fetchImpl });
  if (!preflightResult.ok) {
    console.error("Preflight failed:", preflightResult.manifest);
    await storageImpl.writeJson(config.gcpBucketName, "gold/manifest.json", preflightResult.manifest);
    process.exit(1);
  }
  console.log(`Preflight ok — checked ${preflightResult.checkedEndpoints} endpoints`);

  console.log("Waiting 15s after preflight before bronze fetch...");
  await new Promise((r) => setTimeout(r, 15000));

  // Bronze
  console.log("Running bronze fetch...");
  const bronzeResult = await runBronzeFetch({
    config,
    snapshotDate,
    preflightResult,
    fetchImpl,
    storageImpl,
    sleepImpl: sleep,
  });
  if (!bronzeResult.ok) {
    console.error("Bronze fetch failed:", bronzeResult.reason);
    await storageImpl.writeJson(config.gcpBucketName, "gold/manifest.json", {
      status: "failed",
      snapshot_date: snapshotDate,
      reason: bronzeResult.reason,
    });
    process.exit(1);
  }
  const { skippedEndpoints } = bronzeResult;
  if (skippedEndpoints.length > 0) {
    console.warn(`Bronze: skipped ${skippedEndpoints.length} endpoint(s) after 429 retry: ${skippedEndpoints.join(", ")}`);
  }
  console.log(`Bronze ok — wrote ${bronzeResult.writtenFiles} files`);

  // Silver
  console.log("Running silver normalization...");
  const silverResult = await runSilverNormalization({ config, snapshotDate, storageImpl, skippedEndpoints });
  if (!silverResult.ok) {
    console.error("Silver normalization failed");
    await storageImpl.writeJson(config.gcpBucketName, "gold/manifest.json", {
      status: "failed",
      snapshot_date: snapshotDate,
      reason: "silver normalization failed",
    });
    process.exit(1);
  }
  console.log(`Silver ok — wrote ${silverResult.writtenFiles} files`);

  // Gold
  console.log("Running gold build...");
  const goldResult = await runGoldBuild({ config, snapshotDate, storageImpl, skippedEndpoints });
  if (!goldResult.ok) {
    console.error("Gold build failed:", goldResult.manifest);
    process.exit(1);
  }
  console.log(`Gold ok — staged ${goldResult.stagedFiles}, promoted ${goldResult.promotedFiles} files`);

  console.log("ETL complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("ETL fatal error:", error);
  process.exit(1);
});
