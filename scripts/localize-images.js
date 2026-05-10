#!/usr/bin/env node
// Downloads every robot's image_url to images/<slug>.<ext>
// and rewrites image_url in robots.json to a relative path.
//
// Run: node scripts/localize-images.js
//
// Idempotent: skips files that already exist.
// Falls back to the remote URL if the download fails.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const ROBOTS_PATH = path.join(ROOT, 'data', 'robots.json');
const IMAGES_DIR = path.join(ROOT, 'images');

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function robotSlug(r) { return slug(r.company) + '--' + slug(r.robot_name); }

function extFromContentTypeOrUrl(ct, url) {
  if (ct) {
    if (/jpe?g/i.test(ct)) return '.jpg';
    if (/png/i.test(ct)) return '.png';
    if (/webp/i.test(ct)) return '.webp';
    if (/gif/i.test(ct)) return '.gif';
  }
  const u = url.split('?')[0];
  const m = u.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (m) return '.' + m[1].toLowerCase().replace('jpeg', 'jpg');
  return '.jpg';
}

function fetchOnce(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 humanoid-directory/1.0',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 20000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location;
        if (!loc) return reject(new Error('Redirect without Location'));
        const next = loc.startsWith('http') ? loc : new URL(loc, url).toString();
        res.resume();
        return resolve(fetchOnce(next, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(new Error('Timeout')); });
    req.on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const robots = JSON.parse(fs.readFileSync(ROBOTS_PATH, 'utf8'));

  let succeeded = 0, skipped = 0, failed = 0, alreadyLocal = 0, noImage = 0;
  for (let i = 0; i < robots.length; i++) {
    const r = robots[i];
    if (!r.image_url) { noImage++; continue; }
    if (r.image_url.startsWith('images/') || r.image_url.startsWith('/images/')) { alreadyLocal++; continue; }

    const baseSlug = robotSlug(r);
    // Find any existing file with this slug
    const existing = fs.readdirSync(IMAGES_DIR).find(f => f.startsWith(baseSlug + '.'));
    if (existing) {
      r.image_url = 'images/' + existing;
      skipped++;
      process.stdout.write(`[${i+1}/${robots.length}] ${baseSlug} → cached\n`);
      continue;
    }

    try {
      const { buffer, contentType } = await fetchOnce(r.image_url);
      const ext = extFromContentTypeOrUrl(contentType, r.image_url);
      const filename = baseSlug + ext;
      fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
      r.image_url = 'images/' + filename;
      succeeded++;
      process.stdout.write(`[${i+1}/${robots.length}] ${baseSlug} → ${(buffer.length/1024).toFixed(0)}KB ${ext}\n`);
    } catch (e) {
      failed++;
      process.stdout.write(`[${i+1}/${robots.length}] ${baseSlug} → FAILED: ${e.message}\n`);
      // keep original URL — graceful degradation
    }
  }

  fs.writeFileSync(ROBOTS_PATH, JSON.stringify(robots, null, 2));
  fs.writeFileSync(ROBOTS_PATH.replace('.json', '.js'), 'window.ROBOTS = ' + JSON.stringify(robots, null, 2) + ';\n');

  console.log('\n=== DONE ===');
  console.log('Downloaded:', succeeded);
  console.log('Cached (already local):', skipped + alreadyLocal);
  console.log('Failed (kept remote URL):', failed);
  console.log('Without image_url:', noImage);
}

main().catch(e => { console.error(e); process.exit(1); });
