// Minimal static-file server for Railway / any Node host.
// Serves the project root as a static site. No dependencies.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

// Files that should never be served (working files, sources)
const BLOCKED = [
  /^\/data\/_/,           // any file in /data/ starting with _
  /\/scripts\//,          // build scripts
  /^\/design\//,          // design briefs
  /^\/SHIP\.md$/i,
  /^\/README\.md$/i,
  /\.env(\.|$)/,
];

function isBlocked(urlPath) {
  return BLOCKED.some(re => re.test(urlPath));
}

function safeJoin(rootPath, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(rootPath, decoded));
  if (!resolved.startsWith(rootPath)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  if (isBlocked(urlPath)) {
    res.statusCode = 404;
    return res.end('Not found');
  }

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.statusCode = 400;
    return res.end('Bad request');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Try .html extension on extensionless paths
      const altPath = filePath + '.html';
      fs.stat(altPath, (e2, s2) => {
        if (!e2 && s2.isFile()) return serveFile(altPath, res);
        res.statusCode = 404;
        return res.end('Not found');
      });
      return;
    }
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  // Cache strategy:
  //   - HTML, sitemap, robots.txt, data files: short cache so updates show up fast
  //   - Images and fonts: long cache (they're content-addressed-ish)
  //   - Everything else: short cache by default
  const isImageOrFont = /^(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.svg|\.ico|\.woff2?|\.ttf|\.otf)$/i.test(ext);
  if (isImageOrFont) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    // HTML, JS, JSON, XML, TXT, MD — short cache so freshly-deployed data shows up
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`Humanoid Directory listening on :${PORT}`);
});
