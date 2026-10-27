#!/usr/bin/env node
// Sirve una carpeta compilada (dist o dist-admin) como lo haría Vercel: cualquier ruta cae en index.html.
//   node scripts/serve-dist.js dist 4173
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '..', process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

http
  .createServer((req, res) => {
    const clean = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(dir, clean);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Sirviendo ${dir} en http://localhost:${port}`));
