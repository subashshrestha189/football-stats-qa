const { Storage } = require("@google-cloud/storage");

function createGcsStorage({ serviceAccountKey }) {
  const credentials = JSON.parse(serviceAccountKey);
  const storage = new Storage({ credentials });

  async function readJson(bucketName, objectPath) {
    const [contents] = await storage
      .bucket(bucketName)
      .file(objectPath)
      .download();
    return JSON.parse(contents.toString("utf8"));
  }

  return { readJson };
}

module.exports = { createGcsStorage };
