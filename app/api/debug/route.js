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

    const manifest = await storageImpl.readJson(null, "gold/manifest.json");

    return {
      statusCode: 200,
      body: {
        manifest,
        cache: retriever.getCacheStatus(),
      },
    };
  }

  return {
    handle,
  };
}

module.exports = {
  createDebugHandler,
};
