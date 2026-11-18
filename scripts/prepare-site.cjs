const fs = require('node:fs');
const { createHash } = require('node:crypto');

// These classic scripts extend each other's entry points in this order.
const modules = [
  'app.js',
  'rpc-fix.js',
  'auth-fix.js',
  'password-policy.js',
  'astrology-alpha2.js',
  'insights-alpha30.js',
  'notifications-alpha2.js',
  'calendar-alpha2.js',
  'planner-alpha28.js',
  'planner-alpha28-compat.js',
  'planner-alpha29.js',
  'planner-alpha29-fix.js',
  'palm-alpha2.js',
  'palm-ai-alpha27.js',
  'privacy-alpha2.js',
  'push-alpha2.js',
  'diagnostics-alpha27.js',
  'experience-alpha31.js',
  'experience-alpha31-fix.js',
  'experience-alpha32.js',
  'experience-alpha33.js',
  'calendar-export.js',
];
const dir = 'public/assets';
// This directory contains build output only. Drop assets left by earlier builds.
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

function asset(name, bytes) {
  const version = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  fs.mkdirSync(dir + '/' + version, { recursive: true });
  fs.writeFileSync(dir + '/' + version + '/' + name, bytes);
  return '/assets/' + version + '/' + name;
}

const runtime = asset('runtime-alpha35.js', fs.readFileSync('runtime-alpha35.js'));
const planner = asset('planner.js', modules.map(file => fs.readFileSync(file, 'utf8')).join('\n;\n'));
const sdk = asset('supabase.js', fs.readFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js'));
fs.writeFileSync('app/assets.generated.json', JSON.stringify({ runtime, planner, sdk }));
for (const file of ['icon.svg', 'manifest.json']) fs.copyFileSync(file, 'public/' + file);
