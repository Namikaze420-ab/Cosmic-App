const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const assets = require('../app/assets.generated.json');

// Precache only the exported public shell. Account data and API responses
// never enter the service-worker cache.
const urls = ['/index.html', '/privacy/index.html', '/manifest.json', '/icon.svg', ...Object.values(assets)];
function addChunks(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) addChunks(file);
    else if (/\.(js|css|woff2?)$/.test(file)) urls.push('/' + path.relative('out', file));
  }
}
addChunks('out/_next/static');
urls.sort();
const template = fs.readFileSync('sw.js', 'utf8');
const hash = createHash('sha256').update(template);
for (const url of urls) hash.update(url).update(fs.readFileSync('out' + url.split('?')[0]));
const prefix = 'cosmic-planner-';
const name = prefix + hash.digest('hex').slice(0, 16);
fs.writeFileSync('out/sw.js',
  'const CACHE = ' + JSON.stringify(name) + ';\nconst CORE = ' + JSON.stringify(urls) + ';\n' + template);
