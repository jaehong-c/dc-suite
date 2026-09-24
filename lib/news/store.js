// Daily snapshot storage on Vercel Blob. One JSON file per day plus a
// "latest" pointer, so the page loads instantly and the feeds are only read
// once a day by the cron.
import { put, get } from "@vercel/blob";

const ACCESS = process.env.BLOB_ACCESS === "private" ? "private" : "public";
const PREFIX = "dc-wire";

function configured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveSnapshot(snapshot) {
  if (!configured()) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  const body = JSON.stringify(snapshot);
  const day = snapshot.generatedAt.slice(0, 10);
  const opts = {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  };
  await put(`${PREFIX}/${day}.json`, body, opts);
  const latest = await put(`${PREFIX}/latest.json`, body, opts);
  return latest.url;
}

export async function loadSnapshot() {
  if (!configured()) return null;
  try {
    const result = await get(`${PREFIX}/latest.json`, { access: ACCESS, useCache: false });
    if (!result || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch (err) {
    if (err?.name === "BlobNotFoundError") return null;
    throw err;
  }
}
