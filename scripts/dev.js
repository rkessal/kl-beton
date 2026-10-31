#!/usr/bin/env node
/*
 * npm run dev
 *   - serves src/kl-anim.js (unminified) on http://localhost:5173/kl-anim.js
 *   - /version changes whenever a file in src/ changes (the Webflow loader polls it and reloads)
 *   - opens a Cloudflare quick tunnel (needs `cloudflared`: brew install cloudflared)
 *     and prints the staging link to open.
 *
 * Options: --port 5173   --no-tunnel   --site https://kl-beton.webflow.io
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i === -1 ? def : args[i + 1]; };
const PORT = Number(opt('port', 5173));
const SITE = opt('site', 'https://kl-beton.webflow.io');
const TUNNEL = !args.includes('--no-tunnel');
const SRC = path.join(__dirname, '..', 'src');

let version = Date.now();
fs.watch(SRC, { recursive: true }, (evt, file) => {
  if (!file || file.startsWith('.')) return;
  version = Date.now();
  console.log(`\x1b[36m↻\x1b[0m ${file} changed, pages will reload`);
});

const send = (res, code, type, body) => {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
};

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/version') return send(res, 200, 'text/plain', String(version));
  if (url === '/kl-anim.js') {
    return fs.readFile(path.join(SRC, 'kl-anim.js'), (err, data) =>
      err ? send(res, 500, 'text/plain', String(err)) : send(res, 200, 'text/javascript; charset=utf-8', data));
  }
  send(res, 404, 'text/plain', 'not found');
}).listen(PORT, () => {
  console.log(`\x1b[32m●\x1b[0m dev server  http://localhost:${PORT}/kl-anim.js`);
  if (!TUNNEL) return printLink(`http://localhost:${PORT}`);
  startTunnel();
});

function startTunnel() {
  let cf;
  try {
    cf = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`]);
  } catch (e) { return noCloudflared(); }
  cf.on('error', noCloudflared);
  let found = false;
  const scan = (buf) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(buf));
    if (m && !found) { found = true; printLink(m[0]); }
  };
  cf.stdout.on('data', scan);
  cf.stderr.on('data', scan);
  process.on('SIGINT', () => { cf.kill(); process.exit(0); });
}

function noCloudflared() {
  console.log('\n\x1b[31m✗\x1b[0m cloudflared not found. Install it with:  brew install cloudflared');
  console.log('  (or run `npm run dev -- --no-tunnel` to only serve locally)\n');
  process.exit(1);
}

function printLink(base) {
  console.log(`\x1b[32m●\x1b[0m tunnel      ${base}`);
  console.log(`\n  Open the staging site with your local code:\n\n    ${SITE}/?kl-dev=${base}\n`);
  console.log('  The link is remembered in that browser. Back to the published build:  ?kl-dev=off\n');
}
