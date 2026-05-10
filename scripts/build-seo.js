#!/usr/bin/env node
// Generates SEO assets from data/robots.json:
//   - data/seo-jsonld.html  (script tags to inline into index.html)
//   - sitemap.xml
//   - robots.txt
// Also patches index.html to include the JSON-LD between SEO_JSONLD markers.
//
// Run: node scripts/build-seo.js
// Re-run whenever robots.json changes.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://humanoid.directory';

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function robotSlug(r) {
  return slug(r.company) + '--' + slug(r.robot_name);
}
function escapeXml(s) {
  return String(s || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

const robots = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'robots.json'), 'utf8'));

// ─── JSON-LD ──────────────────────────────────────────────────────────
const availabilityToSchema = {
  shipping_now: 'https://schema.org/InStock',
  preorder: 'https://schema.org/PreOrder',
  pilot_only: 'https://schema.org/LimitedAvailability',
  research_only: 'https://schema.org/LimitedAvailability',
  retired: 'https://schema.org/Discontinued',
};

const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Humanoid Robot Directory',
  numberOfItems: robots.length,
  itemListElement: robots.map((r, i) => {
    const item = {
      '@type': 'Product',
      name: r.robot_name,
      brand: { '@type': 'Brand', name: r.company },
      description: r.short_description || undefined,
      image: r.image_url ? (r.image_url.startsWith('http') ? r.image_url : `${SITE_URL}/${r.image_url}`) : undefined,
      url: `${SITE_URL}/robots/${robotSlug(r)}.html`,
      countryOfOrigin: r.country || undefined,
    };
    if (r.price_usd) {
      item.offers = {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: String(r.price_usd),
        availability: availabilityToSchema[r.availability_status] || 'https://schema.org/LimitedAvailability',
        url: `${SITE_URL}/robots/${robotSlug(r)}.html`,
      };
    }
    return { '@type': 'ListItem', position: i + 1, item };
  }),
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Humanoid Robot Directory',
  url: SITE_URL,
  description: 'The complete directory of humanoid robots: 174 platforms across 17 countries with pricing, availability, lead times, and verified deployments.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Humanoid Robot Directory',
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
};

const jsonldHtml = [
  `<script type="application/ld+json">${JSON.stringify(website)}</script>`,
  `<script type="application/ld+json">${JSON.stringify(organization)}</script>`,
  `<script type="application/ld+json">${JSON.stringify(itemList)}</script>`,
].join('\n');

fs.writeFileSync(path.join(ROOT, 'data', 'seo-jsonld.html'), jsonldHtml);

// ─── sitemap.xml ──────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const sitemapEntries = [
  `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`,
  `  <url><loc>${SITE_URL}/?view=map</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>`,
  `  <url><loc>${SITE_URL}/privacy.html</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>`,
  `  <url><loc>${SITE_URL}/terms.html</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>`,
];

// One URL per robot (real per-robot page)
for (const r of robots) {
  sitemapEntries.push(
    `  <url><loc>${SITE_URL}/robots/${robotSlug(r)}.html</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`
  );
}

// One URL per country (real per-country page)
const countries = [...new Set(robots.map(r => r.country))].filter(Boolean);
for (const c of countries) {
  sitemapEntries.push(
    `  <url><loc>${SITE_URL}/country/${slug(c)}.html</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>`
  );
}

// One URL per use case
const useCases = [...new Set(robots.flatMap(r => r.use_cases || []))];
for (const u of useCases) {
  sitemapEntries.push(
    `  <url><loc>${SITE_URL}/?usecase=${u}</loc><lastmod>${today}</lastmod><priority>0.6</priority></url>`
  );
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

// ─── robots.txt ───────────────────────────────────────────────────────
const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robotsTxt);

// ─── Patch index.html ─────────────────────────────────────────────────
const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const startMarker = '<!-- SEO_JSONLD_START -->';
const endMarker = '<!-- SEO_JSONLD_END -->';
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);
if (startIdx !== -1 && endIdx !== -1) {
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  html = before + '\n' + jsonldHtml + '\n' + after;
}

// Cache-bust the robots.js script tag with the dataset length + last modified time.
// This way every dataset change is a different URL and browsers always fetch fresh.
const robotsPath = path.join(ROOT, 'data', 'robots.json');
const stat = fs.statSync(robotsPath);
const cacheBust = `${robots.length}-${Math.floor(stat.mtimeMs)}`;
html = html.replace(
  /<script src="data\/robots\.js(?:\?v=[^"]*)?"><\/script>/,
  `<script src="data/robots.js?v=${cacheBust}"></script>`
);

fs.writeFileSync(indexPath, html);
console.log('✓ Patched index.html (JSON-LD + robots.js cache-bust v=' + cacheBust + ')');

// ─── Summary ──────────────────────────────────────────────────────────
console.log(`✓ data/seo-jsonld.html (${(jsonldHtml.length / 1024).toFixed(1)}KB)`);
console.log(`✓ sitemap.xml (${sitemapEntries.length} URLs)`);
console.log(`✓ robots.txt`);
console.log(`Site URL: ${SITE_URL} (override with SITE_URL=... env var)`);
