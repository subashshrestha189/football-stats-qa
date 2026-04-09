const { Storage } = require("@google-cloud/storage");

function createGcsStorage({ serviceAccountKey }) {
  const credentials = JSON.parse(serviceAccountKey);
  console.log("GCS client init — key type:", credentials.type, "| project:", credentials.project_id);
  const storage = new Storage({ credentials });

  async function readJson(bucketName, objectPath) {
    console.log("Reading GCS:", bucketName, objectPath);
    try {
      const [contents] = await storage
        .bucket(bucketName)
        .file(objectPath)
        .download();
      console.log("GCS read success, bytes:", contents.length, "path:", objectPath);
      return JSON.parse(contents.toString("utf8"));
    } catch (gcsError) {
      console.error("GCS read failed:", gcsError.message, "| code:", gcsError.code, "| path:", objectPath);
      throw gcsError;
    }
  }

  return { readJson };
}

module.exports = { createGcsStorage };
