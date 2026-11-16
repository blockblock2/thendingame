# ThEndinGame

A site at **thendingame.pages.dev** where every game lives at `thendingame.pages.dev/<name>`,
plus a BananaPeel app for adding games.

## Add a game

1. In [TurboWarp Packager](https://packager.turbowarp.org), under **Environment** pick **Zip** (or Plain HTML), then **Package** and download.
2. Open **ThEndinGame Uploader**, choose the .zip, type a name, click **Upload**.
3. It's live at `thendingame.pages.dev/<name>` and on the home page. No redeploy needed.

Install the app:

```bash
bananapeel install blockblock2/thendingame
```

## One-time site setup (from the repo folder)

```bash
npx wrangler pages project create thendingame --production-branch main
npx wrangler kv namespace create thendingame-games --binding GAMES --update-config
npx wrangler pages secret put UPLOAD_KEY --project-name thendingame
npx wrangler pages deploy
```

The upload key is a password you make up; type the same one into the app's Settings.

## How it works

- `site/` is the home page (lists games from `/api/games`).
- `functions/api/` handles uploads, protected by the `UPLOAD_KEY` secret.
- `functions/[game]/` serves each game's files from the `GAMES` KV namespace (Cloudflare free tier, no card).
- `uploader.html` is the BananaPeel app: it unzips the packager .zip itself and uploads each file.

Limits (Cloudflare free KV): 25 MB per file, 1,000 file uploads a day.
