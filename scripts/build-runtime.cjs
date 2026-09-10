const { buildSync } = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'runtime-alpha35.js');
const result = buildSync({
  absWorkingDir:root,
  entryPoints:['src/runtime/browser.ts'],
  bundle:true,
  platform:'browser',
  format:'iife',
  target:'es2022',
  charset:'utf8',
  legalComments:'none',
  write:false,
  banner:{ js:'// Generated from src/domain and src/runtime. Run npm run build:runtime; do not edit.' },
});
const bytes = result.outputFiles[0].contents;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || !Buffer.from(bytes).equals(fs.readFileSync(output))) {
    throw new Error('runtime-alpha35.js is missing or stale. Run npm run build:runtime and commit the result.');
  }
  console.log('Runtime bundle matches the typed sources.');
} else {
  fs.writeFileSync(output, bytes);
  console.log(`Built runtime-alpha35.js (${bytes.length} bytes).`);
}
