// Serves an uploaded game at /<name>/...
import { validName } from "../../lib/shared.js";

export async function onRequest({ request, env, params, next }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  const raw = decodeURIComponent(params.game);
  const name = raw.toLowerCase();
  if (!validName(name)) return next();

  const parts = [].concat(params.path || []).map((p) => decodeURIComponent(p));

  // /MyGame or /mygame  ->  /mygame/  (so the game's own relative links work)
  if (raw !== name || (parts.length === 0 && !url.pathname.endsWith("/"))) {
    const rest = url.pathname.split("/").slice(2).join("/");
    return Response.redirect(`${url.origin}/${name}/${rest}${url.search}`, 301);
  }

  const kv = env.GAMES;
  if (!kv) return new Response("Storage not connected.", { status: 500 });

  let path = parts.join("/");
  if (path === "" || path.endsWith("/")) path += "index.html";

  let hit = await kv.getWithMetadata(`f:${name}/${path}`, { type: "stream" });
  if (!hit.value && !/\.[a-z0-9]+$/i.test(path)) {
    hit = await kv.getWithMetadata(`f:${name}/${path}/index.html`, { type: "stream" });
  }
  if (!hit.value) return notFound(name, url.origin);

  return new Response(request.method === "HEAD" ? null : hit.value, {
    headers: {
      "Content-Type": (hit.metadata && hit.metadata.type) || "application/octet-stream",
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound(name, origin) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not found · ThEndinGame</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0912;color:#eee;font:16px system-ui,sans-serif;text-align:center}
a{color:#ff5470}</style>
<div><h1 style="font-size:48px;margin:0">404</h1><p>There's no game called <b>${name.replace(/[<>&"]/g, "")}</b> here.</p>
<p><a href="${origin}/">See all games</a></p></div>`;
  return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
