const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const assets = require('../app/assets.generated.json');

test('offline manifest covers the exported Next shell, typed runtime, planner and auth client', () => {
  const html = fs.readFileSync('out/index.html', 'utf8');
  const worker = fs.readFileSync('out/sw.js', 'utf8');
  const ctx = vm.createContext({ self: { addEventListener() {} } });
  const urls = vm.runInContext(worker + '\nCORE;', ctx);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:href|src)="(\/[^"]+)"/g)) {
    assert.ok(urls.includes(match[1]), 'missing shell asset ' + match[1]);
  }
  for (const url of [...Object.values(assets), '/index.html']) assert.ok(urls.includes(url), url);
  for (const url of urls) assert.ok(fs.existsSync('out' + url.split('?')[0]), url);
  assert.equal(fs.existsSync('out/supabase'), false);
});
