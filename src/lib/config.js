const REQUIRED_ENV_VARS = [
  "GCP_BUCKET_NAME",
  "GCP_SA_KEY_APP",
  "ANTHROPIC_API_KEY",
];

function loadConfig(env = process.env) {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !env[name]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  try {
    JSON.parse(env.GCP_SA_KEY_APP);
  } catch (_error) {
    throw new Error(
      "Invalid environment variable GCP_SA_KEY_APP: must be valid JSON"
    );
  }

  return {
    gcpServiceAccountKey: env.GCP_SA_KEY_APP,
    gcpBucketName: env.GCP_BUCKET_NAME,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    ...(env.DEBUG_KEY ? { debugKey: env.DEBUG_KEY } : {}),
  };
}

let cachedConfig;

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig(process.env);
  }

  return cachedConfig;
}

const ETL_REQUIRED_ENV_VARS = [
  "FOOTBALL_API_KEY",
  "GCP_SA_KEY",
  "GCP_BUCKET_NAME",
  "SEASON",
];

function loadEtlConfig(env = process.env) {
  const missingVars = ETL_REQUIRED_ENV_VARS.filter((name) => !env[name]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  try {
    JSON.parse(env.GCP_SA_KEY);
  } catch (_error) {
    throw new Error(
      "Invalid environment variable GCP_SA_KEY: must be valid JSON"
    );
  }

  return {
    footballApiKey: env.FOOTBALL_API_KEY,
    gcpServiceAccountKey: env.GCP_SA_KEY,
    gcpBucketName: env.GCP_BUCKET_NAME,
    season: env.SEASON,
  };
}

module.exports = {
  REQUIRED_ENV_VARS,
  loadConfig,
  getConfig,
  loadEtlConfig,
};
