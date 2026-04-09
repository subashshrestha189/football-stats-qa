const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CONFIG_MODULE_PATH = "../src/lib/config.js";

function loadConfigModule() {
  delete require.cache[require.resolve(CONFIG_MODULE_PATH)];
  return require(CONFIG_MODULE_PATH);
}

test("loadConfig returns required env values when all are present", () => {
  const { loadConfig } = loadConfigModule();

  const config = loadConfig({
    GCP_SA_KEY_APP: '{"client_email":"app-runner@example.com"}',
    GCP_BUCKET_NAME: "football-stats-qa-prod",
    OPENAI_API_KEY: "sk-test",
  });

  assert.deepEqual(config, {
    gcpServiceAccountKey: '{"client_email":"app-runner@example.com"}',
    gcpBucketName: "football-stats-qa-prod",
    openAiApiKey: "sk-test",
  });
});

test("loadConfig throws a clear error listing missing required env vars", () => {
  const { loadConfig } = loadConfigModule();

  assert.throws(
    () =>
      loadConfig({
        GCP_BUCKET_NAME: "football-stats-qa-prod",
      }),
    {
      name: "Error",
      message:
        "Missing required environment variables: GCP_SA_KEY_APP, OPENAI_API_KEY",
    }
  );
});

test("getConfig reads process.env and fails clearly when startup config is incomplete", () => {
  const originalEnv = process.env;

  process.env = {
    ...originalEnv,
    GCP_SA_KEY_APP: '{"client_email":"app-runner@example.com"}',
    GCP_BUCKET_NAME: "football-stats-qa-prod",
    OPENAI_API_KEY: "",
  };

  try {
    const { getConfig } = loadConfigModule();

    assert.throws(() => getConfig(), {
      name: "Error",
      message: "Missing required environment variables: OPENAI_API_KEY",
    });
  } finally {
    process.env = originalEnv;
  }
});

test("loadConfig fails fast when GCP_SA_KEY_APP is not valid JSON", () => {
  const { loadConfig } = loadConfigModule();

  assert.throws(
    () =>
      loadConfig({
        GCP_SA_KEY_APP: "{not-json}",
        GCP_BUCKET_NAME: "football-stats-qa-prod",
        OPENAI_API_KEY: "sk-test",
        FOOTBALL_API_KEY: "football-test",
        SEASON: "2024/25",
      }),
    {
      name: "Error",
      message: "Invalid environment variable GCP_SA_KEY_APP: must be valid JSON",
    }
  );
});

test("aliases.json defines deterministic competition and team alias maps", () => {
  const aliasesPath = path.join(__dirname, "..", "src", "config", "aliases.json");
  const aliases = JSON.parse(fs.readFileSync(aliasesPath, "utf8"));
  const teamNames = Object.keys(aliases.teams);

  assert.deepEqual(Object.keys(aliases).sort(), ["competitions", "teams"]);
  assert.ok(aliases.competitions.EPL.includes("premier league"));
  assert.ok(aliases.competitions.UCL.includes("champions league"));
  assert.equal(teamNames.length, 52);
  assert.ok(aliases.teams["Manchester City"].includes("man city"));
  assert.ok(aliases.teams["Manchester United"].includes("man utd"));
  assert.ok(aliases.teams["Tottenham Hotspur"].includes("spurs"));
  assert.ok(aliases.teams["Paris Saint-Germain"].includes("psg"));
  assert.ok(aliases.teams["Bayern Munich"].includes("bayern"));
  assert.ok(aliases.teams["RB Leipzig"].includes("leipzig"));
  assert.ok(aliases.teams["Inter Milan"].includes("inter"));
  assert.ok(aliases.teams["AC Milan"].includes("milan"));
  assert.ok(aliases.teams["Atletico de Madrid"].includes("atletico madrid"));
  assert.ok(aliases.teams["Red Star Belgrade"].includes("crvena zvezda"));
  assert.ok(aliases.teams["Dinamo Zagreb"].includes("gnk dinamo"));
  assert.ok(aliases.teams["PSV"].includes("psv eindhoven"));
});

test(".env.example lists every required runtime variable without real secrets", () => {
  const envExamplePath = path.join(__dirname, "..", ".env.example");
  const envExample = fs.readFileSync(envExamplePath, "utf8");

  assert.match(envExample, /^GCP_SA_KEY_APP=$/m);
  assert.match(envExample, /^GCP_BUCKET_NAME=$/m);
  assert.match(envExample, /^OPENAI_API_KEY=$/m);
  assert.match(envExample, /^FOOTBALL_API_KEY=$/m);
  assert.match(envExample, /^SEASON=$/m);
  assert.doesNotMatch(envExample, /sk-[A-Za-z0-9]/);
});

test("application code accesses environment variables only through config.js", () => {
  const repoRoot = path.join(__dirname, "..");
  const allowedPath = path.join(repoRoot, "src", "lib", "config.js");
  const filesToCheck = [];

  function walk(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (
        entry.name === ".git" ||
        entry.name === ".next" ||
        entry.name === "node_modules"
      ) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!fullPath.endsWith(".js")) {
        continue;
      }

      if (fullPath.startsWith(path.join(repoRoot, "tests"))) {
        continue;
      }

      filesToCheck.push(fullPath);
    }
  }

  walk(repoRoot);

  const offenders = filesToCheck.filter((filePath) => {
    if (filePath === allowedPath) {
      return false;
    }

    return fs.readFileSync(filePath, "utf8").includes("process.env");
  });

  assert.deepEqual(offenders, []);
});

test("issue #2 project scaffolding directories exist", () => {
  const repoRoot = path.join(__dirname, "..");
  const requiredDirectories = [
    path.join(repoRoot, "app"),
    path.join(repoRoot, "app", "api"),
    path.join(repoRoot, "src"),
    path.join(repoRoot, "src", "config"),
    path.join(repoRoot, "src", "etl"),
    path.join(repoRoot, "src", "lib"),
    path.join(repoRoot, "tests"),
  ];

  for (const directoryPath of requiredDirectories) {
    assert.ok(
      fs.existsSync(directoryPath),
      `Expected directory to exist: ${directoryPath}`
    );
  }
});
