# Ship Checklist

Pre-flight before public launch.

## What's now built

- ✅ **JSON-LD structured data** — `WebSite`, `Organization`, and `ItemList` of all 174 robots with `Product` schema (name, brand, image, description, country of origin, offer price + availability for the 32 with public pricing). Inlined into `index.html` between `SEO_JSONLD_*` markers.
- ✅ **sitemap.xml** — 205 URLs (root, map view, privacy, terms, 174 robot deep-links, 17 country pages, 10 use-case pages).
- ✅ **robots.txt** — points crawlers to the sitemap.
- ✅ **OG / Twitter Card meta tags** — `og:image`, `og:title`, `og:description`, `og:url`, `twitter:card=summary_large_image`. Canonical URL set.
- ✅ **og-image.png** — 1200×630 placeholder (typography-only). Replace with a designed version when Claude Design ships.
- ✅ **Plausible analytics drop-in** — privacy-friendly, cookieless. Custom event `Waitlist Signup` with props `{ robot, company, country }`.
- ✅ **Privacy + Terms pages** — `privacy.html`, `terms.html`. Linked from footer. Cover GDPR/CCPA, retention, deletion, affiliate disclosure.
- ✅ **Deep-link routing** — query params `?robot=`, `?country=`, `?usecase=`, `?budget=`, `?compare=`, `?order=`, `?view=map` all work. Modals push state, back button closes them, URLs are shareable.
- ✅ **Slug-based robot URLs** — e.g. `tesla--optimus-gen-2-gen-3`. Stable, lower-case, kebab-case.

## TODO before deploy

### 1. Replace placeholder domain (5 min)

Currently the site assumes `https://humanoid.directory` everywhere. Before deploy, decide on your real domain and find/replace:

```bash
# Replace in canonical, OG tags, JSON-LD, sitemap, etc.
grep -rl "humanoid.directory" . --include="*.html" --include="*.xml" --include="*.txt" --include="*.js"
```

If you keep `humanoid.directory`, register the domain (`.directory` is a real gTLD).

### 2. Sign up for Plausible (or remove it) (10 min)

The site is loading the Plausible script with `data-domain="humanoid.directory"`. It will silently log to a non-existent account until you:
- Sign up at https://plausible.io ($9/mo) or self-host
- Add your domain to Plausible
- Update `data-domain="..."` in `index.html` to match the domain you registered

If you want to launch without analytics, just delete the `<script defer data-domain=...>` line.

### 3. Replace OG image with a designed version (post-Claude Design)

`og-image.png` is currently a placeholder generated from `og-image.svg` via `qlmanage`. When Claude Design returns, replace it with a proper 1200×630 PNG.

### 4. Localize images (30 min)

Currently 173 of 174 image_url values are hotlinks to third-party CDNs (news outlets, aggregators, company sites). For stability + licensing posture:

- Write a script that downloads each image to `images/<slug>.jpg`
- Update `data/robots.json` to point to the local path
- Re-run `node scripts/build-seo.js` to regenerate JSON-LD with new image paths

### 5. Real waitlist backend (30 min)

Today the waitlist uses `mailto:` + `localStorage`. That breaks for ~60% of mobile / corporate / browser-Gmail users.

Drop-in options:
- **Tally.so** — free, instant. Replace the `<form>` action.
- **Formspree** — free tier 50 submissions/mo. Simplest swap.
- **Loops.so** — purpose-built for waitlist + transactional mail.
- **Cloudflare Worker + KV** — free, your own endpoint. ~30 min.

Replace this block in `index.html`:

```js
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
iframe.src = mailto;
document.body.appendChild(iframe);
```

with:

```js
fetch('YOUR_ENDPOINT', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, robot_id: id, robot_name: robot.robot_name, ts: Date.now() }),
});
```

### 6. Pick a host

- **Cloudflare Pages** — free, fastest for static sites, easy custom domain
- **Vercel** — free, also great
- **Netlify** — free, has built-in form endpoint (could replace step 5 entirely)

```bash
# From the project root after committing to git:
git init && git add . && git commit -m "Initial directory"
# Then connect repo to Cloudflare Pages / Vercel / Netlify dashboard
```

### 7. Test on real devices

- iPhone Safari (private mode + regular)
- Android Chrome
- Desktop Safari, Chrome, Firefox
- Try sharing a deep link (e.g. `?robot=apptronik--apollo`) on Twitter/iMessage to confirm OG image renders

## Build commands

```bash
# Regenerate SEO assets after editing data/robots.json:
node scripts/build-seo.js

# With a custom domain:
SITE_URL=https://yourdomain.com node scripts/build-seo.js
```

## File map

```
humanoid-directory/
├── index.html                 The directory site (single page)
├── privacy.html               Privacy policy
├── terms.html                 Terms of use
├── sitemap.xml                Generated; 205 URLs
├── robots.txt                 Points to sitemap
├── og-image.svg               OG image source (editable)
├── og-image.png               OG image (1200x630, used by social platforms)
├── README.md                  Methodology + image-licensing notes
├── SHIP.md                    This file
│
├── data/
│   ├── robots.json            174 robots, full schema (200KB)
│   ├── robots.js              Same data wrapped as window.ROBOTS for browser
│   ├── world-110m.json        TopoJSON for the Map view
│   ├── seo-jsonld.html        Generated; injected into index.html
│   ├── SCHEMA.md              Field-by-field guide
│   └── _*.json                Working files (regional research splits, image hunt drafts)
│
├── design/
│   ├── PROMPT.md              Creative prompt for Claude Design
│   └── BRIEF.md               Full design brief
│
└── scripts/
    └── build-seo.js           Regenerate JSON-LD + sitemap + robots.txt from data
```

## Smoke-test before sharing publicly

- [ ] Open in incognito — does the page render in <3s?
- [ ] Click a robot card — does the URL update with `?robot=...`?
- [ ] Copy that URL, paste into a new tab — does the modal open directly?
- [ ] Hit back — does the modal close and URL revert?
- [ ] Click Map → click a country bubble — does the side panel render with stats?
- [ ] Click Order → does the "Coming soon" modal show + accept email?
- [ ] Submit waitlist with a test email — does the success state show?
- [ ] Check Plausible dashboard — does the page view register? (Once domain is set up.)
- [ ] Paste your URL into https://opengraph.xyz — does the OG card preview correctly?
- [ ] Run https://search.google.com/test/rich-results on your URL — does the Product schema validate?
- [ ] Run Lighthouse — Performance ≥ 85, Accessibility ≥ 95, SEO = 100.
