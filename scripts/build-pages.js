#!/usr/bin/env node
// Generates per-country SEO landing pages at /country/<slug>.html
// (Per-robot pages are generated separately by build-robot-pages.js)
//
// Run: node scripts/build-pages.js
// Pass SITE_URL=https://yourdomain.com to use a real domain.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://humanoid.directory';
const robots = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'robots.json'), 'utf8'));

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function robotSlug(r) { return slug(r.company) + '--' + slug(r.robot_name); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeXml(s) { return String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]); }
function fmtPrice(r) {
  if (!r.price_usd) return null;
  return '$' + (r.price_usd >= 1000 ? Math.round(r.price_usd/1000) + 'K' : r.price_usd.toLocaleString());
}
const availLabel = a => ({ shipping_now: 'Shipping now', preorder: 'Preorder', pilot_only: 'In customer trials', research_only: 'Lab', retired: 'Retired' })[a] || a;
const useCaseLabel = u => ({ warehouse_logistics: 'Warehouse', industrial_manufacturing: 'Manufacturing', home_consumer: 'Home', research_education: 'Research', customer_service: 'Service', security_inspection: 'Security', healthcare_eldercare: 'Healthcare', defense_eod: 'Defense', entertainment_events: 'Entertainment', agriculture_outdoor: 'Outdoor' })[u] || u;

function aggregate(rows) {
  const priced = rows.filter(r => r.price_usd);
  const ucCounts = {};
  for (const r of rows) for (const u of (r.use_cases || [])) ucCounts[u] = (ucCounts[u] || 0) + 1;
  const topUseCases = Object.entries(ucCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([u]) => u);
  const companyCounts = {};
  for (const r of rows) companyCounts[r.company] = (companyCounts[r.company] || 0) + 1;
  const topCompanies = Object.entries(companyCounts).sort((a,b)=>b[1]-a[1]).slice(0, 6).map(([c,n]) => ({ company: c, count: n }));
  const statusMix = rows.reduce((a,r)=>{a[r.availability_status]=(a[r.availability_status]||0)+1;return a;},{});
  const topRobots = [...rows].sort((a,b) => {
    const so = { shipping_now: 0, preorder: 1, pilot_only: 2, research_only: 3, retired: 4 };
    const sa = so[a.availability_status] ?? 5, sb = so[b.availability_status] ?? 5;
    if (sa !== sb) return sa - sb;
    return (b.funding_usd_m || 0) - (a.funding_usd_m || 0);
  });
  const sumPrice = priced.reduce((s,r)=>s+r.price_usd, 0);
  const fundedRobots = rows.filter(r => r.funding_usd_m);
  const sumFunding = fundedRobots.reduce((s,r)=>s+r.funding_usd_m, 0);
  return {
    count: rows.length,
    priced_count: priced.length,
    avg_price: priced.length ? Math.round(sumPrice / priced.length) : null,
    median_price: priced.length ? priced.map(r=>r.price_usd).sort((a,b)=>a-b)[Math.floor(priced.length/2)] : null,
    funded_count: fundedRobots.length,
    avg_funding: fundedRobots.length ? Math.round(sumFunding / fundedRobots.length) : null,
    top_use_cases: topUseCases, top_companies: topCompanies, status_mix: statusMix,
    top_robots: topRobots,
    commercial_pct: rows.length ? Math.round(100 * (statusMix.shipping_now || 0) / rows.length) : 0,
    deployments: rows.filter(r => r.verified_deployments && r.verified_deployments.length).length,
  };
}

function signature(agg) {
  const parts = [];
  if (agg.commercial_pct >= 50) parts.push(`${agg.commercial_pct}% shipping commercially`);
  else if (agg.commercial_pct >= 20) parts.push(`${agg.commercial_pct}% commercial, the rest in trials or labs`);
  else parts.push(`mostly research and prototypes (${agg.commercial_pct}% commercial)`);
  if (agg.median_price) {
    const p = agg.median_price;
    if (p < 15000) parts.push(`median price $${(p/1000).toFixed(1)}K, price aggressive`);
    else if (p < 60000) parts.push(`median price $${(p/1000).toFixed(0)}K, mid market`);
    else if (p < 200000) parts.push(`median price $${(p/1000).toFixed(0)}K, premium tier`);
    else parts.push(`median price $${(p/1000).toFixed(0)}K, flagship enterprise tier`);
  }
  if (agg.top_use_cases.length) {
    parts.push(`focus areas: ${agg.top_use_cases.map(u => useCaseLabel(u).toLowerCase()).join(', ')}`);
  }
  return parts.join('. ') + '.';
}

function commonHead({ title, description, url, image }) {
  return `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image || (SITE_URL + '/og-image.png'))}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image || (SITE_URL + '/og-image.png'))}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Geist+Mono:wght@100..900&family=Inter:wght@300..600&display=swap" rel="stylesheet" />`;
}

function pageStyles() {
  // Lean shared stylesheet for page-level (country, robot) views
  return `
  :root { --obsidian:#080808; --obsidian-1:#0d0d0d; --white:#fff; --silver:#E2E8F0; --silver-faint:rgba(226,232,240,0.55); --silver-dim:rgba(226,232,240,0.35); --silver-grad:linear-gradient(135deg,#F8FAFC 0%,#94A3B8 100%); --border:rgba(255,255,255,0.08); --border-strong:rgba(255,255,255,0.18); --glass:rgba(255,255,255,0.02); --ease:cubic-bezier(0.16,1,0.3,1); }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:var(--obsidian); color:var(--silver); font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; line-height:1.6; }
  a { color: var(--silver); text-decoration: none; }
  a:hover { color: var(--white); }
  .nav { position:sticky; top:0; z-index:60; backdrop-filter:blur(24px); background:rgba(8,8,8,0.7); border-bottom:1px solid var(--border); padding:22px 0; }
  .nav-inner { width:92vw; max-width:1600px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:24px; }
  .brand { font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:var(--white); font-weight:500; }
  .nav-links { display:flex; gap:4px; padding:4px; border:1px solid var(--border); border-radius:999px; background:var(--glass); }
  .nav-links a { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--silver-faint); padding:8px 14px; border-radius:999px; }
  .nav-links a:hover { color:var(--white); background:rgba(255,255,255,0.04); }
  @media (max-width:720px) { .nav-links { display:none; } }
  .silver-btn { background:var(--silver-grad); color:var(--obsidian); font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; font-weight:600; padding:11px 20px; border-radius:999px; border:0; cursor:pointer; }
  .ghost-btn { background:transparent; color:var(--silver); font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; padding:10px 18px; border:1px solid var(--border-strong); border-radius:999px; cursor:pointer; }
  .container { width:92vw; max-width:1600px; margin:0 auto; padding:64px 0; }
  .crumbs { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--silver-dim); margin-bottom:24px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .crumbs a { color:var(--silver-faint); }
  h1 { font-family:'DM Serif Display',serif; font-style:italic; font-weight:400; font-size:clamp(48px,8vw,112px); line-height:0.9; letter-spacing:-0.04em; color:var(--white); margin:0 0 24px; max-width:14ch; }
  h1 .grad { background:var(--silver-grad); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .lede { color:var(--silver); font-size:18px; line-height:1.6; max-width:680px; margin:0 0 48px; }
  .signature-card { background:var(--glass); border:1px solid var(--border); border-radius:1rem; padding:24px 28px; margin:48px 0; }
  .signature-card .lbl { font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.32em; text-transform:uppercase; color:var(--silver-dim); margin-bottom:8px; }
  .signature-card p { margin:0; font-family:'DM Serif Display',serif; font-style:italic; font-size:24px; line-height:1.4; letter-spacing:-0.01em; color:var(--white); }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--border); border-radius:1rem; overflow:hidden; margin:32px 0 48px; background:var(--border); gap:1px; }
  .stats .cell { background:var(--obsidian); padding:24px; }
  .stats .cell .lbl { font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.32em; text-transform:uppercase; color:var(--silver-dim); }
  .stats .cell .num { font-family:'DM Serif Display',serif; font-style:italic; font-size:48px; line-height:1; color:var(--white); margin-top:8px; letter-spacing:-0.02em; }
  @media (max-width:920px) { .stats { grid-template-columns:repeat(2,1fr); } }
  .section-h { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.32em; text-transform:uppercase; color:var(--silver-dim); margin:48px 0 16px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
  .card { background:var(--glass); border:1px solid var(--border); border-radius:1rem; overflow:hidden; transition:all .25s var(--ease); display:flex; flex-direction:column; }
  .card:hover { border-color:var(--border-strong); transform:translateY(-2px); }
  .card .photo { aspect-ratio:4/3; background:var(--obsidian-1); border-bottom:1px solid var(--border); position:relative; }
  .card .photo img { width:100%; height:100%; object-fit:cover; filter:grayscale(1); opacity:0.9; mix-blend-mode:luminosity; transition:all .3s var(--ease); }
  .card:hover .photo img { filter:grayscale(0); opacity:1; mix-blend-mode:normal; }
  .card .price { position:absolute; top:10px; left:10px; font-family:'Geist Mono',monospace; font-size:10px; padding:4px 10px; background:var(--white); color:var(--obsidian); border-radius:999px; font-weight:600; letter-spacing:0.06em; }
  .card .badge { position:absolute; top:10px; right:10px; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border-strong); padding:4px 10px; border-radius:999px; background:rgba(8,8,8,0.6); backdrop-filter:blur(12px); font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--silver); }
  .card .badge .dot { width:6px; height:6px; border-radius:50%; background:var(--white); }
  .card .body { padding:14px 16px 16px; }
  .card .name { font-family:'DM Serif Display',serif; font-style:italic; font-size:20px; color:var(--white); line-height:1.05; }
  .card .company { font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--silver-faint); margin-top:4px; }
  .card .desc { color:var(--silver-faint); font-size:13px; line-height:1.55; margin-top:8px; }
  .companies-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:1rem; overflow:hidden; }
  .companies-list .item { background:var(--obsidian); padding:18px 20px; display:flex; justify-content:space-between; align-items:center; }
  .companies-list .item .nm { font-family:'DM Serif Display',serif; font-style:italic; font-size:18px; color:var(--white); }
  .companies-list .item .ct { font-family:'Geist Mono',monospace; font-size:10px; color:var(--silver-dim); letter-spacing:0.18em; text-transform:uppercase; }
  .neighbors { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .neighbors a { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; padding:8px 14px; border:1px solid var(--border-strong); border-radius:999px; color:var(--silver); }
  .neighbors a:hover { color:var(--white); border-color:var(--white); }
  footer { width:92vw; max-width:1600px; margin:96px auto 0; padding:48px 0; border-top:1px solid var(--border); color:var(--silver-dim); font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; line-height:1.9; }
  footer p { margin:0 0 12px; }
  footer a { color:var(--silver-faint); border-bottom:1px solid var(--border); }
  `;
}

function renderCard(r) {
  const img = r.image_url
    ? `<img src="${escapeHtml('../' + r.image_url)}" alt="${escapeHtml(r.robot_name)}" loading="lazy" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--silver-dim);font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:0.18em;">NO IMAGE YET</div>`;
  const price = fmtPrice(r);
  const desc = r.short_description ? `<div class="desc">${escapeHtml(r.short_description.slice(0, 140))}${r.short_description.length > 140 ? '…' : ''}</div>` : '';
  return `<a class="card" href="../?robot=${escapeHtml(robotSlug(r))}">
    <div class="photo">${img}${price ? `<div class="price">${price}</div>` : ''}<div class="badge"><span class="dot"></span>${availLabel(r.availability_status)}</div></div>
    <div class="body">
      <div class="name">${escapeHtml(r.robot_name)}</div>
      <div class="company">${escapeHtml(r.company)}</div>
      ${desc}
    </div>
  </a>`;
}

function renderCountryPage(country, rows, allCountries) {
  const agg = aggregate(rows);
  const sig = signature(agg);
  const countrySlug = slug(country);
  const url = `${SITE_URL}/country/${countrySlug}.html`;

  const title = `Humanoid Robots in ${country} — Pricing, Companies, Deployments`;
  const description = `${rows.length} humanoid robot platforms built in ${country}. ${sig}`;

  // JSON-LD CollectionPage with Product list
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: rows.length,
      itemListElement: agg.top_robots.slice(0, 12).map((r, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: {
          '@type': 'Product',
          name: r.robot_name,
          brand: { '@type': 'Brand', name: r.company },
          image: r.image_url ? (r.image_url.startsWith('http') ? r.image_url : `${SITE_URL}/${r.image_url}`) : undefined,
          countryOfOrigin: r.country,
          url: `${SITE_URL}/?robot=${robotSlug(r)}`,
        },
      })),
    },
  };

  const neighbors = allCountries.filter(c => c !== country).map(c => `<a href="${slug(c)}.html">${escapeHtml(c)} (${aggregate(robots.filter(r => r.country === c)).count})</a>`).join('');
  const featured = agg.top_robots.slice(0, 12).map(renderCard).join('');
  const allRobots = agg.top_robots.slice(12).map(renderCard).join('');

  return `<!doctype html>
<html lang="en">
<head>
${commonHead({ title, description, url })}
<style>${pageStyles()}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../" class="brand">HUMANOID / DIRECTORY</a>
    <div class="nav-links">
      <a href="../">01 · CATALOG</a>
      <a href="../?view=map">02 · MAP</a>
    </div>
    <div style="display:flex;gap:8px;">
      <a href="mailto:a@nuff.tech" class="ghost-btn">Contact</a>
      <a href="../#hero-capture" class="silver-btn" style="text-decoration:none;display:inline-block;">Join</a>
    </div>
  </div>
</nav>

<div class="container">
  <div class="crumbs"><a href="../">// DIRECTORY</a> <span>/</span> <span>${escapeHtml(country)}</span></div>
  <h1>Humanoid robots<br/><span class="grad">in ${escapeHtml(country)}.</span></h1>
  <p class="lede">${rows.length} platform${rows.length===1?'':'s'} built here, from ${agg.top_companies.length} companies and labs. ${escapeHtml(country)} is part of a global market of 174 humanoids across 17 countries.</p>

  <div class="signature-card">
    <div class="lbl">// THE SHAPE OF ${escapeHtml(country.toUpperCase())}'S HUMANOID MARKET</div>
    <p>${escapeHtml(sig)}</p>
  </div>

  <div class="stats">
    <div class="cell"><div class="lbl">Total platforms</div><div class="num">${agg.count}</div></div>
    <div class="cell"><div class="lbl">Shipping today</div><div class="num">${agg.status_mix.shipping_now || 0}</div></div>
    <div class="cell"><div class="lbl">Verified deployments</div><div class="num">${agg.deployments}</div></div>
    <div class="cell"><div class="lbl">${agg.median_price ? 'Median price' : 'With public pricing'}</div><div class="num">${agg.median_price ? '$' + (agg.median_price/1000).toFixed(0) + 'K' : agg.priced_count}</div></div>
  </div>

  <div class="section-h">// FEATURED PLATFORMS</div>
  <div class="grid">${featured}</div>

  ${allRobots ? `<div class="section-h">// ALL ${rows.length} ROBOTS FROM ${escapeHtml(country.toUpperCase())}</div><div class="grid">${allRobots}</div>` : ''}

  ${agg.top_companies.length ? `<div class="section-h">// TOP BUILDERS</div><div class="companies-list">${agg.top_companies.map(c => `<div class="item"><div class="nm">${escapeHtml(c.company)}</div><div class="ct">${c.count} platform${c.count===1?'':'s'}</div></div>`).join('')}</div>` : ''}

  <div class="section-h">// OTHER COUNTRIES</div>
  <div class="neighbors">${neighbors}</div>
</div>

<footer>
  <p>Part of <a href="../">humanoid.directory</a>. The complete reference of humanoid robots: pricing, availability, lead times, verified deployments. <a href="../">View the full catalog →</a></p>
  <p style="margin-top:16px;"><a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a> · <a href="mailto:a@nuff.tech">Contact</a></p>
</footer>
</body>
</html>`;
}

// ─── Build ────────────────────────────────────────────────────────────
const countryDir = path.join(ROOT, 'country');
if (!fs.existsSync(countryDir)) fs.mkdirSync(countryDir, { recursive: true });

const countries = [...new Set(robots.map(r => r.country))].filter(Boolean).sort();
let count = 0;
for (const country of countries) {
  const rows = robots.filter(r => r.country === country);
  const html = renderCountryPage(country, rows, countries);
  const filename = slug(country) + '.html';
  fs.writeFileSync(path.join(countryDir, filename), html);
  count++;
}

console.log(`✓ Generated ${count} country pages in /country/`);
console.log(`  Site URL: ${SITE_URL} (override with SITE_URL=...)`);
