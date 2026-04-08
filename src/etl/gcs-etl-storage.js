const { Storage } = require("@google-cloud/storage");

function createGcsEtlStorage({ serviceAccountKey }) {
  const credentials = JSON.parse(serviceAccountKey);
  const storage = new Storage({ credentials });

  async function readJson(bucketName, objectPath) {
    const [contents] = await storage.bucket(bucketName).file(objectPath).download();
    return JSON.parse(contents.toString("utf8"));
  }

  async function writeJson(bucketName, objectPath, data) {
    const contents = JSON.stringify(data, null, 2);
    await storage.bucket(bucketName).file(objectPath).save(contents, {
      contentType: "application/json",
    });
  }

  async function copyObject(bucketName, srcPath, destPath) {
    await storage.bucket(bucketName).file(srcPath).copy(
      storage.bucket(bucketName).file(destPath)
    );
  }

  return { readJson, writeJson, copyObject };
}

module.exports = { createGcsEtlStorage };
