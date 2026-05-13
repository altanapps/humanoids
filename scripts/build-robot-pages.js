#!/usr/bin/env node
// Generates per-robot SEO landing pages at /robots/<slug>.html
// Each page: full meta, JSON-LD Product, video embed (when available), specs, deployments.
//
// Run: node scripts/build-robot-pages.js
// Pass SITE_URL=https://yourdomain.com to use a real domain.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://whichhumanoid.ai';

const robots = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'robots.json'), 'utf8'));
let videos = [];
try { videos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', '_videos.json'), 'utf8')); } catch {}

// Build a video lookup: company||robot_name -> { youtube_id, title, channel, shows }
const videoByKey = new Map();
for (const v of videos) {
  if (!v.youtube_id) continue;
  videoByKey.set(v.company + '||' + v.robot_name, v);
}

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function robotSlug(r) { return slug(r.company) + '--' + slug(r.robot_name); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(v, unit) { return v == null ? '—' : `${v}${unit ? ' ' + unit : ''}`; }
function fmtPrice(r) {
  if (!r.price_usd) return null;
  return '$' + (r.price_usd >= 1000 ? Math.round(r.price_usd/1000) + 'K' : r.price_usd.toLocaleString());
}
const availLabel = a => ({ shipping_now: 'Shipping now', preorder: 'Preorder', pilot_only: 'In customer trials', research_only: 'Lab', retired: 'Retired' })[a] || a;
const availSchema = a => ({ shipping_now: 'https://schema.org/InStock', preorder: 'https://schema.org/PreOrder', pilot_only: 'https://schema.org/LimitedAvailability', research_only: 'https://schema.org/LimitedAvailability', retired: 'https://schema.org/Discontinued' })[a] || 'https://schema.org/LimitedAvailability';
const useCaseLabel = u => ({ warehouse_logistics: 'Warehouse', industrial_manufacturing: 'Manufacturing', home_consumer: 'Home', research_education: 'Research', customer_service: 'Service', security_inspection: 'Security', healthcare_eldercare: 'Healthcare', defense_eod: 'Defense', entertainment_events: 'Entertainment', agriculture_outdoor: 'Outdoor' })[u] || u;

function pageHead({ title, description, url, image }) {
  return `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="product" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Geist+Mono:wght@100..900&family=Inter:wght@300..600&display=swap" rel="stylesheet" />
<script defer data-domain="whichhumanoid.ai" src="https://plausible.io/js/script.js"></script>
<script>window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }</script>`;
}

function pageStyles() {
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
  .silver-btn:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(255,255,255,0.18); }
  .ghost-btn { background:transparent; color:var(--silver); font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; padding:10px 18px; border:1px solid var(--border-strong); border-radius:999px; cursor:pointer; }

  .container { width:92vw; max-width:1100px; margin:0 auto; padding:48px 0; }
  .crumbs { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--silver-dim); margin-bottom:24px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .crumbs a { color:var(--silver-faint); }
  .badge { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--border-strong); padding:6px 14px; border-radius:999px; background:rgba(8,8,8,0.6); font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--silver); margin-bottom:16px; }
  .badge .dot { width:6px; height:6px; border-radius:50%; background:var(--white); }
  .badge.shipping_now .dot { background:var(--white); box-shadow:0 0 8px rgba(255,255,255,0.6); }
  .badge.preorder .dot { background:var(--silver); }
  .badge.pilot_only .dot { background:var(--silver-faint); }
  .badge.research_only .dot { background:var(--silver-dim); }
  .badge.retired .dot { background:rgba(226,232,240,0.15); }
  h1 { font-family:'DM Serif Display',serif; font-style:italic; font-weight:400; font-size:clamp(48px,8vw,96px); line-height:0.9; letter-spacing:-0.04em; color:var(--white); margin:0 0 20px; }
  .company-line { font-family:'Geist Mono',monospace; font-size:12px; letter-spacing:0.22em; text-transform:uppercase; color:var(--silver-faint); margin-bottom:32px; }
  .company-line a { color:var(--white); border-bottom:1px solid var(--border); }
  .lede { color:var(--silver); font-size:18px; line-height:1.65; max-width:720px; margin:0 0 32px; }

  .price-row { display:flex; align-items:baseline; gap:18px; padding:20px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:32px; }
  .price-big { font-family:'DM Serif Display',serif; font-style:italic; font-size:56px; letter-spacing:-0.03em; color:var(--white); line-height:1; }
  .price-note { color:var(--silver-faint); font-family:'Geist Mono',monospace; font-size:12px; letter-spacing:0.04em; }
  .cta-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:48px; }

  .video-wrap { position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border:1px solid var(--border); border-radius:12px; background:var(--obsidian-1); margin-bottom:48px; }
  .video-wrap iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:0; }
  .video-meta { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--silver-dim); margin:-32px 0 48px; }

  .hero-img { width:100%; aspect-ratio:16/9; object-fit:cover; border:1px solid var(--border); border-radius:12px; filter:grayscale(0.2); margin-bottom:48px; background:var(--obsidian-1); }

  .section-h { font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.32em; text-transform:uppercase; color:var(--silver-dim); margin:48px 0 20px; padding-bottom:12px; border-bottom:1px solid var(--border); }

  .specs { display:grid; grid-template-columns:1fr 1fr; gap:0 24px; font-family:'Geist Mono',monospace; }
  .specs .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); font-size:13px; letter-spacing:0.04em; }
  .specs .k { color:var(--silver-dim); text-transform:uppercase; font-size:10px; letter-spacing:0.18em; }
  .specs .v { color:var(--white); font-variant-numeric:tabular-nums; }

  .deployment { background:var(--glass); border:1px solid var(--border); border-left:2px solid var(--white); border-radius:8px; padding:16px 18px; margin-bottom:10px; }
  .deployment .customer { font-family:'DM Serif Display',serif; font-style:italic; color:var(--white); font-size:20px; }
  .deployment .meta { color:var(--silver-dim); font-family:'Geist Mono',monospace; font-size:10px; margin-top:6px; letter-spacing:0.18em; text-transform:uppercase; }
  .deployment .body { font-size:14px; color:var(--silver); margin-top:8px; line-height:1.6; }
  .deployment-empty { color:var(--silver-dim); font-family:'Geist Mono',monospace; font-size:11px; padding:12px 0; letter-spacing:0.18em; text-transform:uppercase; }

  .uc-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:32px; }
  .uc-tags span { font-family:'Geist Mono',monospace; font-size:10px; padding:4px 10px; border-radius:999px; color:var(--silver-faint); border:1px solid var(--border); letter-spacing:0.18em; text-transform:uppercase; }

  .related { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
  .related .card { background:var(--glass); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .related .card:hover { border-color:var(--border-strong); }
  .related .card img { width:100%; aspect-ratio:4/3; object-fit:cover; filter:grayscale(1); opacity:0.9; mix-blend-mode:luminosity; }
  .related .card:hover img { filter:grayscale(0); opacity:1; mix-blend-mode:normal; }
  .related .card .body { padding:12px 14px; }
  .related .card .nm { font-family:'DM Serif Display',serif; font-style:italic; font-size:18px; color:var(--white); }
  .related .card .cm { font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--silver-dim); margin-top:4px; }

  footer { width:92vw; max-width:1600px; margin:96px auto 0; padding:48px 0; border-top:1px solid var(--border); color:var(--silver-dim); font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; line-height:1.9; }
  footer p { margin:0 0 12px; }
  footer a { color:var(--silver-faint); border-bottom:1px solid var(--border); }
  `;
}

function relatedRobots(r, n = 4) {
  return robots
    .filter(x => x._slug_ !== r._slug_ && (x.country === r.country || (r.use_cases || []).some(u => (x.use_cases || []).includes(u))))
    .map(x => ({
      x,
      score:
        (x.country === r.country ? 2 : 0) +
        (r.use_cases || []).filter(u => (x.use_cases || []).includes(u)).length +
        (x.availability_status === r.availability_status ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(o => o.x);
}

function renderRobotPage(r) {
  const sl = robotSlug(r);
  const url = `${SITE_URL}/robots/${sl}.html`;
  const imageUrl = r.image_url
    ? (r.image_url.startsWith('http') ? r.image_url : `${SITE_URL}/${r.image_url}`)
    : `${SITE_URL}/og-image.png`;
  const localImage = r.image_url ? '../' + r.image_url : null;

  const price = fmtPrice(r);
  const priceDescr = price ? `${price}${r.price_note ? '. ' + r.price_note : ''}.` : 'Contact for pricing.';
  const title = `${r.robot_name} (${r.company}) — Specs, Pricing, Deployments`;
  const description = `${r.short_description || ''} ${priceDescr} Status: ${availLabel(r.availability_status).toLowerCase()}.`.trim();

  // JSON-LD Product
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: r.robot_name,
    brand: { '@type': 'Brand', name: r.company },
    description: r.short_description || undefined,
    image: imageUrl,
    countryOfOrigin: r.country,
    url,
    additionalProperty: [
      r.height_cm && { '@type': 'PropertyValue', name: 'Height', value: r.height_cm + ' cm' },
      r.weight_kg && { '@type': 'PropertyValue', name: 'Weight', value: r.weight_kg + ' kg' },
      r.payload_kg && { '@type': 'PropertyValue', name: 'Payload', value: r.payload_kg + ' kg' },
      r.dof && { '@type': 'PropertyValue', name: 'Degrees of freedom', value: r.dof },
      r.walking_speed_ms && { '@type': 'PropertyValue', name: 'Walking speed', value: r.walking_speed_ms + ' m/s' },
      r.battery_hours && { '@type': 'PropertyValue', name: 'Battery life', value: r.battery_hours + ' h' },
    ].filter(Boolean),
  };
  if (r.price_usd) {
    product.offers = {
      '@type': 'Offer', priceCurrency: 'USD', price: String(r.price_usd),
      availability: availSchema(r.availability_status), url,
    };
  }
  if (typeof r.editorial_score === 'number') {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: r.editorial_score,
      bestRating: 10,
      worstRating: 0,
      ratingCount: 1,
      reviewCount: 1,
    };
    product.review = {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.editorial_score, bestRating: 10 },
      author: { '@type': 'Organization', name: 'whichhumanoid.ai' },
      reviewBody: r.editorial_verdict,
    };
  }

  const video = videoByKey.get(r.company + '||' + r.robot_name);
  let videoSchema = null;
  if (video) {
    videoSchema = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title || `${r.robot_name} demonstration`,
      description: video.shows || `${r.robot_name} by ${r.company}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${video.youtube_id}`,
      contentUrl: `https://www.youtube.com/watch?v=${video.youtube_id}`,
      uploadDate: '2024-01-01',
    };
  }

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Directory', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: r.country, item: `${SITE_URL}/country/${slug(r.country)}.html` },
      { '@type': 'ListItem', position: 3, name: r.robot_name, item: url },
    ],
  };

  const specs = [
    ['Country', r.country || '—'],
    ['HQ city', r.hq_city || '—'],
    ['Year revealed', r.year_revealed || '—'],
    ['Height', fmt(r.height_cm, 'cm')],
    ['Weight', fmt(r.weight_kg, 'kg')],
    ['Payload', fmt(r.payload_kg, 'kg')],
    ['Degrees of freedom', fmt(r.dof, '')],
    ['Walking speed', fmt(r.walking_speed_ms, 'm/s')],
    ['Battery life', fmt(r.battery_hours, 'h')],
    ['Lead time', r.lead_time_weeks ? r.lead_time_weeks + ' weeks' : '—'],
    ['Funding raised', r.funding_usd_m ? '$' + r.funding_usd_m + 'M' : '—'],
    ['Support regions', (r.support_regions || []).join(', ') || '—'],
  ];

  const deployments = (r.verified_deployments && r.verified_deployments.length)
    ? r.verified_deployments.map(d => `
        <div class="deployment">
          <div class="customer">${escapeHtml(d.customer)} ${d.year ? `<span style="color:var(--silver-dim);font-size:13px;font-family:'Geist Mono',monospace;font-style:normal;letter-spacing:0.06em;">· ${d.year}</span>` : ''}</div>
          ${d.details ? `<div class="body">${escapeHtml(d.details)}</div>` : ''}
          ${d.source ? `<div class="meta"><a href="${escapeHtml(d.source)}" target="_blank" rel="noopener">Source ↗</a></div>` : ''}
        </div>`).join('')
    : (r.key_customers_or_pilots && r.key_customers_or_pilots.length
        ? `<div class="deployment-empty">// Reported pilots: ${r.key_customers_or_pilots.map(escapeHtml).join(', ')}</div>`
        : `<div class="deployment-empty">// No verified deployments listed yet.</div>`);

  const useCaseTags = (r.use_cases || []).map(u => `<span>${useCaseLabel(u)}</span>`).join('');

  // Related
  r._slug_ = sl;
  for (const x of robots) x._slug_ = robotSlug(x);
  const related = relatedRobots(r, 4);
  const relatedHtml = related.map(x => `
    <a class="card" href="${escapeHtml(robotSlug(x))}.html">
      ${x.image_url ? `<img src="${escapeHtml('../' + x.image_url)}" alt="${escapeHtml(x.robot_name)}" loading="lazy" />` : ''}
      <div class="body"><div class="nm">${escapeHtml(x.robot_name)}</div><div class="cm">${escapeHtml(x.company)}</div></div>
    </a>
  `).join('');

  const videoBlock = video ? `
    <div class="video-wrap">
      <iframe loading="lazy" src="https://www.youtube.com/embed/${escapeHtml(video.youtube_id)}?rel=0" title="${escapeHtml(video.title || r.robot_name)}" allowfullscreen></iframe>
    </div>
    <div class="video-meta">// ${escapeHtml(video.title || 'Demo video')} · ${escapeHtml(video.channel || '')}${video.shows ? ' · ' + escapeHtml(video.shows) : ''}</div>
  ` : '';

  const heroImg = (!video && localImage) ? `<img class="hero-img" src="${escapeHtml(localImage)}" alt="${escapeHtml(r.robot_name)}" />` : '';

  return `<!doctype html>
<html lang="en">
<head>
${pageHead({ title, description, url, image: imageUrl })}
<style>${pageStyles()}</style>
<script type="application/ld+json">${JSON.stringify(product)}</script>
${videoSchema ? `<script type="application/ld+json">${JSON.stringify(videoSchema)}</script>` : ''}
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../" class="brand">HUMANOID / DIRECTORY</a>
    <div class="nav-links">
      <a href="../">01 · CATALOG</a>
      <a href="../?view=map">02 · MAP</a>
      <a href="../?view=chart">03 · CHART</a>
    </div>
    <div style="display:flex;gap:8px;">
      <a href="mailto:a@nuff.tech" class="ghost-btn">Contact</a>
      <a href="../?order=${escapeHtml(sl)}" class="silver-btn" style="text-decoration:none;display:inline-block;">Order →</a>
    </div>
  </div>
</nav>

<div class="container">
  <div class="crumbs">
    <a href="../">// DIRECTORY</a> <span>/</span>
    <a href="../country/${slug(r.country)}.html">${escapeHtml(r.country)}</a> <span>/</span>
    <span>${escapeHtml(r.robot_name)}</span>
  </div>

  <div class="badge ${escapeHtml(r.availability_status)}"><span class="dot"></span>${availLabel(r.availability_status)}</div>
  <h1>${escapeHtml(r.robot_name)}.</h1>
  <div class="company-line">By ${r.website ? `<a href="${escapeHtml(r.website)}" target="_blank" rel="noopener">${escapeHtml(r.company)} ↗</a>` : escapeHtml(r.company)} · ${escapeHtml(r.country)}${r.year_revealed ? ` · Revealed ${r.year_revealed}` : ''}</div>

  ${useCaseTags ? `<div class="uc-tags">${useCaseTags}</div>` : ''}

  ${r.short_description ? `<p class="lede">${escapeHtml(r.short_description)}</p>` : ''}

  ${typeof r.editorial_score === 'number' ? `
    <div style="background:var(--glass);border:1px solid var(--border);border-left:3px solid var(--white);border-radius:8px;padding:24px 28px;margin:32px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <span style="font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:var(--silver-dim);">// Editor's verdict · whichhumanoid.ai</span>
        <span style="font-family:'DM Serif Display',serif;font-style:italic;font-size:56px;line-height:1;color:var(--white);letter-spacing:-0.02em;">${r.editorial_score.toFixed(1)}<span style="font-family:'Geist Mono',monospace;font-style:normal;font-size:14px;color:var(--silver-dim);letter-spacing:0.06em;margin-left:6px;">/10</span></span>
      </div>
      <div style="font-family:'DM Serif Display',serif;font-style:italic;font-size:22px;line-height:1.4;color:var(--white);letter-spacing:-0.01em;">${escapeHtml(r.editorial_verdict || '')}</div>
    </div>
  ` : ''}

  <div class="price-row">
    <div class="price-big">${price || 'Contact'}</div>
    ${r.price_note ? `<div class="price-note">${escapeHtml(r.price_note)}</div>` : ''}
  </div>

  <div class="cta-row">
    <a href="../?order=${escapeHtml(sl)}" class="silver-btn" style="text-decoration:none;display:inline-block;">Order →</a>
    <a href="../?compare=${escapeHtml(sl)}" class="ghost-btn" style="text-decoration:none;display:inline-block;">Add to compare</a>
  </div>

  ${videoBlock || heroImg}

  <div class="section-h">// Specs</div>
  <div class="specs">
    ${specs.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${escapeHtml(String(v))}</span></div>`).join('')}
  </div>

  <div class="section-h">// Verified deployments</div>
  ${deployments}

  ${related.length ? `<div class="section-h">// Related platforms</div><div class="related">${relatedHtml}</div>` : ''}
</div>

<footer>
  <p>Part of <a href="../">whichhumanoid.ai</a>. The complete reference of humanoid robots: pricing, availability, lead times, verified deployments. <a href="../">View the full catalog →</a></p>
  <p style="margin-top:16px;"><a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a> · <a href="mailto:a@nuff.tech">Contact</a></p>
</footer>
</body>
</html>`;
}

// ─── Build ────────────────────────────────────────────────────────────
const robotsDir = path.join(ROOT, 'robots');
if (!fs.existsSync(robotsDir)) fs.mkdirSync(robotsDir, { recursive: true });

let count = 0, withVideo = 0;
for (const r of robots) {
  const html = renderRobotPage(r);
  const filename = robotSlug(r) + '.html';
  fs.writeFileSync(path.join(robotsDir, filename), html);
  count++;
  if (videoByKey.get(r.company + '||' + r.robot_name)) withVideo++;
}

console.log(`✓ Generated ${count} robot pages in /robots/`);
console.log(`  ${withVideo} include an embedded video`);
console.log(`  Site URL: ${SITE_URL} (override with SITE_URL=...)`);
