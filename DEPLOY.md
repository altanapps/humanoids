# Deploy to Railway

## What's set up

- **`server.js`** — minimal zero-dependency Node static server. Serves the project root, blocks working files (`data/_*.json`, `scripts/`, `design/`, `SHIP.md`, `README.md`).
- **`package.json`** — `start` script runs the server, `build` regenerates SEO assets.
- **`railway.json`** — Railway config: Nixpacks builder, runs build then starts server, healthcheck on `/`.
- **`.gitignore`** — excludes `node_modules`, working data files, env files.

## One-time setup

1. **Install Railway CLI** (if not already):
   ```bash
   curl -fsSL https://railway.com/install.sh | sh
   ```
2. **Log in**:
   ```bash
   railway login
   ```
3. **Initialize git in the project** (first time only):
   ```bash
   cd /Users/altan/Desktop/new-chapter/research/humanoid-directory
   git init
   git add .
   git commit -m "Initial humanoid directory"
   ```

## Deploy

From inside the project directory:

```bash
railway init       # Create new Railway project (first time only)
railway up         # Builds and deploys
```

That's it. Railway will:
1. Detect Node from `package.json`
2. Run `node scripts/build-seo.js` (regenerates JSON-LD + sitemap)
3. Start `node server.js`
4. Bind to whatever port Railway provides (server respects `PORT` env var)
5. Give you a `*.up.railway.app` URL

## Custom domain

Once deployed, in the Railway dashboard:
1. Go to your project → Settings → Domains
2. Add custom domain (e.g. `humanoid.directory`)
3. Update DNS at your registrar — point to Railway's CNAME target
4. Wait for SSL certificate (~5 min)

## After deploy: replace placeholder domain

Run with the real domain to regenerate SEO assets pointing to the right URL:

```bash
SITE_URL=https://humanoid.directory node scripts/build-seo.js
```

Commit and `railway up` again.

Also update in `index.html`:
- `<meta property="og:url" content="https://humanoid.directory/" />`
- `<meta property="og:image" content="https://humanoid.directory/og-image.png" />`
- `<meta name="twitter:image" content="https://humanoid.directory/og-image.png" />`
- `<link rel="canonical" href="https://humanoid.directory/" />`
- The Plausible `data-domain="humanoid.directory"` (or replace with whatever domain you registered)

## Sanity check after deploy

```bash
curl -I https://yourdomain.up.railway.app/                   # → 200
curl -I https://yourdomain.up.railway.app/sitemap.xml        # → 200
curl -I https://yourdomain.up.railway.app/privacy.html       # → 200
curl -I https://yourdomain.up.railway.app/data/_us.json      # → 404 (working file, blocked)
curl -I https://yourdomain.up.railway.app/scripts/build-seo  # → 404 (build script, blocked)
```

Then run the URL through:
- https://opengraph.xyz — preview the OG card
- https://search.google.com/test/rich-results — validate Product / WebSite schema
- https://pagespeed.web.dev — Lighthouse score

## Why Railway here

For a static site you could also use Cloudflare Pages, Vercel, or Netlify — all free, all great. Railway is fine because:
- Single-platform if you ever add a backend (e.g., real waitlist API replacing the `mailto:`)
- No build-step config needed; Nixpacks handles Node automatically
- Zero infra overhead

If you'd rather host static-only on Cloudflare Pages, the only files you need are everything except `server.js`, `package.json`, `railway.json`, and `node_modules/`.

## Cost

Railway free tier: $5 in credits/mo. This site (no DB, ~200KB serving) will use roughly $1–3/mo at modest traffic. Custom domain is free.
