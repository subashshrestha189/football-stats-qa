const { createSign } = require("node:crypto");

function base64url(str) {
  return Buffer.from(str).toString("base64url");
}

async function fetchAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.read_only",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const sig = sign.sign(credentials.private_key, "base64url");
  const jwt = `${header}.${claim}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GCS auth failed: HTTP ${res.status} — ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

function createGcsStorage({ serviceAccountKey }) {
  const credentials = JSON.parse(serviceAccountKey);
  console.log("GCS client init — key type:", credentials.type, "| project:", credentials.project_id);

  let cachedToken = null;
  let tokenExpiresAt = 0;

  async function getToken() {
    if (cachedToken && Date.now() / 1000 < tokenExpiresAt - 60) {
      return cachedToken;
    }
    cachedToken = await fetchAccessToken(credentials);
    tokenExpiresAt = Math.floor(Date.now() / 1000) + 3600;
    return cachedToken;
  }

  async function readJson(bucketName, objectPath) {
    console.log("Reading GCS:", bucketName, objectPath);
    try {
      const token = await getToken();
      const encoded = encodeURIComponent(objectPath);
      const url = `https://storage.googleapis.com/download/storage/v1/b/${bucketName}/o/${encoded}?alt=media`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`GCS read failed: HTTP ${res.status} | bucket=${bucketName} path=${objectPath} | ${body}`);
        err.code = res.status;
        throw err;
      }

      const text = await res.text();
      console.log("GCS read success, bytes:", text.length, "| path:", objectPath);
      return JSON.parse(text);
    } catch (gcsError) {
      console.error("GCS read failed:", gcsError.message);
      throw gcsError;
    }
  }

  return { readJson };
}

module.exports = { createGcsStorage };
