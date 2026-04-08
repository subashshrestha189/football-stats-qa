const REQUIRED_ENV_VARS = [
  "FOOTBALL_API_KEY",
  "GCP_BUCKET_NAME",
  "GCP_SA_KEY_APP",
  "OPENAI_API_KEY",
  "SEASON",
];

function loadConfig(env = process.env) {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !env[name]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  return {
    gcpServiceAccountKey: env.GCP_SA_KEY_APP,
    gcpBucketName: env.GCP_BUCKET_NAME,
    openAiApiKey: env.OPENAI_API_KEY,
    footballApiKey: env.FOOTBALL_API_KEY,
    season: env.SEASON,
  };
}

let cachedConfig;

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig(process.env);
  }

  return cachedConfig;
}

module.exports = {
  REQUIRED_ENV_VARS,
  loadConfig,
  getConfig,
};
