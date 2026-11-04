#!/usr/bin/env node
// npm run release            -> patch bump (1.1.8 -> 1.1.9)
// npm run release -- minor   -> minor bump (1.1.8 -> 1.2.0)
// npm run release -- --test  -> run the test suite first (needs playwright)
//
// Builds, bumps package.json, commits, tags vX.Y.Z, pushes master + tag, then purges jsDelivr's
// @latest cache so the Webflow loader (…/kl-beton@latest/dist/kl-anim.min.js) serves the new build
// within a minute instead of after jsDelivr's cache expires. No change needed in Webflow.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), https = require('https');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const kind = args.find(a => a === 'major' || a === 'minor' || a === 'patch') || 'patch';
const run = cmd => { console.log('$ ' + cmd); execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); };
const out = cmd => execSync(cmd, { cwd: ROOT }).toString().trim();

const branch = out('git rev-parse --abbrev-ref HEAD');
if (branch !== 'master') { console.error('Release from master (you are on ' + branch + ').'); process.exit(1); }

const pkgFile = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
// next version = one above the highest of package.json and the existing tags
const tags = out('git tag --list "v*"').split('\n').filter(Boolean).map(t => t.slice(1).split('.').map(Number));
const cur = [pkg.version.split('.').map(Number)].concat(tags).sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
const next = kind === 'major' ? [cur[0] + 1, 0, 0] : kind === 'minor' ? [cur[0], cur[1] + 1, 0] : [cur[0], cur[1], cur[2] + 1];
const version = next.join('.'), tag = 'v' + version;

run(args.includes('--test') ? 'npm test' : 'npm run build');
pkg.version = version;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
run('git add -A');
run('git commit -m "Release ' + tag + '"');
run('git tag ' + tag);
run('git push origin master ' + tag);

const purge = 'https://purge.jsdelivr.net/gh/rkessal/kl-beton@latest/dist/kl-anim.min.js';
https.get(purge, res => {
  let body = ''; res.on('data', d => body += d);
  res.on('end', () => {
    console.log('\nReleased ' + tag + '. jsDelivr purge: HTTP ' + res.statusCode);
    console.log('The site picks it up on the next page load (cached builds may take a minute).');
  });
}).on('error', e => console.log('\nReleased ' + tag + ', but the jsDelivr purge failed (' + e.message + '). Open ' + purge + ' in a browser.'));
