// ThEndinGame API
//   GET    /api/games                         list of games (public)
//   GET    /api/check                         is the upload key right?
//   POST   /api/games/<name>/start            clear out an old copy before uploading
//   PUT    /api/games/<name>/files/<path>     upload one file (body = the file)
//   POST   /api/games/<name>/finish           { title, files, bytes } — makes it live on the home page
//   DELETE /api/games/<name>                  remove a game
import { json, authorized, validName, deleteGame, typeOf, CORS } from "../../lib/shared.js";

const MAX_FILE = 25 * 1024 * 1024; // KV's limit per value

export async function onRequest({ request, env, params }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const kv = env.GAMES;
  if (!kv) return json({ error: "The GAMES storage isn't connected to the site yet." }, 500);

  const parts = [].concat(params.path || []).map((p) => decodeURIComponent(p));
  const method = request.method;

  // Public: list games
  if (method === "GET" && parts.length === 1 && parts[0] === "games") {
    const games = [];
    let cursor;
    do {
      const page = await kv.list({ prefix: "g:", cursor });
      for (const k of page.keys) {
        const info = k.metadata || {};
        games.push({ name: k.name.slice(2), title: info.title || k.name.slice(2), added: info.added || null });
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    games.sort((a, b) => String(b.added).localeCompare(String(a.added)));
    return json({ games });
  }

  // Everything else needs the upload key
  if (!authorized(request, env)) {
    return json({ error: env.UPLOAD_KEY ? "Wrong upload key." : "The site has no upload key set yet." }, 401);
  }

  if (method === "GET" && parts.length === 1 && parts[0] === "check") return json({ ok: true });

  if (parts[0] !== "games" || parts.length < 2) return json({ error: "Not found." }, 404);
  const name = parts[1];
  if (!validName(name)) {
    return json({ error: "Names can only use lowercase letters, numbers, - and _ (up to 40), and can't be \"api\"." }, 400);
  }

  if (method === "DELETE" && parts.length === 2) {
    await deleteGame(kv, name);
    return json({ ok: true });
  }

  if (method === "POST" && parts.length === 3 && parts[2] === "start") {
    await deleteGame(kv, name);
    return json({ ok: true });
  }

  if (method === "PUT" && parts.length >= 4 && parts[2] === "files") {
    const path = parts.slice(3).join("/");
    if (!path || path.split("/").some((s) => s === "" || s === "." || s === "..") || path.length > 400) {
      return json({ error: `Bad file name: ${path}` }, 400);
    }
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_FILE) {
      return json({ error: `${path} is ${(body.byteLength / 1048576).toFixed(1)} MB — files can be at most 25 MB.` }, 413);
    }
    await kv.put(`f:${name}/${path}`, body, { metadata: { type: typeOf(path) } });
    return json({ ok: true });
  }

  if (method === "POST" && parts.length === 3 && parts[2] === "finish") {
    let info = {};
    try { info = await request.json(); } catch {}
    if (!(await kv.get(`f:${name}/index.html`, { type: "stream" }))) {
      return json({ error: "That upload has no index.html, so there's nothing to open." }, 400);
    }
    const meta = {
      title: String(info.title || name).slice(0, 80),
      added: new Date().toISOString(),
    };
    await kv.put(`g:${name}`, JSON.stringify({ ...meta, files: info.files || 0, bytes: info.bytes || 0 }), { metadata: meta });
    return json({ ok: true, url: `/${name}/` });
  }

  return json({ error: "Not found." }, 404);
}
