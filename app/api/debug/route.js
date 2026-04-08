function createDebugHandler({ config, retriever, storageImpl }) {
  async function handle({ headers }) {
    if (headers["x-debug-key"] !== config.debugKey) {
      return {
        statusCode: 401,
        body: {
          error: "Unauthorized",
        },
      };
    }

    try {
      const manifest = await storageImpl.readJson(
        config.gcpBucketName ?? null,
        "gold/manifest.json"
      );

      return {
        statusCode: 200,
        body: {
          manifest,
          cache: retriever.getCacheStatus(),
        },
      };
    } catch (_error) {
      return {
        statusCode: 503,
        body: {
          error: "Debug data unavailable",
        },
      };
    }
  }

  return {
    handle,
  };
}

module.exports = {
  createDebugHandler,
};
