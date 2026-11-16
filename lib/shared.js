// Shared helpers for ThEndinGame's Pages Functions.
// Games live in the GAMES KV namespace:
//   g:<name>          -> game info (JSON: title, added, files, bytes)
//   f:<name>/<path>   -> one file of the game (bytes; metadata { type })

export const RESERVED = new Set(["api", "index.html", "favicon.svg", "_routes.json", "404.html"]);
export const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function validName(name) {
  return typeof name === "string" && NAME_RE.test(name) && !RESERVED.has(name);
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
}

export function authorized(request, env) {
  const key = env.UPLOAD_KEY;
  if (!key) return false;
  const got = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (got.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= got.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

const TYPES = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", ico: "image/x-icon", bmp: "image/bmp", wav: "audio/wav", mp3: "audio/mpeg",
  ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm", wasm: "application/wasm",
  ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2", sb3: "application/x.scratch.sb3",
  zip: "application/zip", xml: "application/xml", webmanifest: "application/manifest+json",
};

export function typeOf(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}

export async function deleteGame(kv, name) {
  let cursor;
  do {
    const page = await kv.list({ prefix: `f:${name}/`, cursor });
    await Promise.all(page.keys.map((k) => kv.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  await kv.delete(`g:${name}`);
}
