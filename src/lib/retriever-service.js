function createRetrieverService({ config, storageImpl, nowProvider }) {
  const cache = new Map();
  const ttlMs = 5 * 60 * 1000;

  async function readManifest() {
    return readWithCache("gold/manifest.json");
  }

  function getCacheStatus() {
    return {
      size: cache.size,
      keys: [...cache.keys()],
    };
  }

  async function readWithCache(objectPath) {
    const nowMs = nowProvider().getTime();
    const cached = cache.get(objectPath);

    if (cached && nowMs - cached.cachedAt < ttlMs) {
      return cached.payload;
    }

    const payload = await storageImpl.readJson(config.gcpBucketName, objectPath);
    cache.set(objectPath, {
      cachedAt: nowMs,
      payload,
    });
    return payload;
  }

  async function retrieve({ competition, intent }) {
    const manifest = await readManifest();

    if (manifest.status !== "complete") {
      return {
        type: "unavailable",
        emptyReason: "data_unavailable",
        snapshotDate: manifest.snapshot_date,
      };
    }

    const objectPath =
      intent === "standings"
        ? `gold/latest/${competition}/standings.json`
        : intent === "top_scorers"
          ? `gold/latest/${competition}/scorers.json`
          : `gold/latest/${competition}/matches.json`;

    const payload = await readWithCache(objectPath);

    if (intent === "standings" && competition === "UCL" && payload.ucl_phase !== "league_phase") {
      return {
        type: "empty",
        emptyReason: "competition_phase_unsupported",
        snapshotDate: payload.snapshot_date,
      };
    }

    const data =
      intent === "recent_results"
        ? payload.recent_results
        : intent === "upcoming_fixtures"
          ? payload.upcoming_fixtures
          : payload.rows;

    return {
      type: "answer",
      competition,
      intent,
      snapshotDate: payload.snapshot_date,
      data,
    };
  }

  return {
    retrieve,
    getCacheStatus,
  };
}

module.exports = {
  createRetrieverService,
};
