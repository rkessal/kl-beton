// Mobile menu: a tap in the empty area below the links closes it (and doesn't click the page behind).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4594);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 375, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4594/index.html'); await p.waitForTimeout(1500);
  const open = () => p.evaluate(() => document.querySelector('.navbar').classList.contains('kl-menu-open'));
  await p.click('.kl-menu-btn'); await p.waitForTimeout(1300); const o1 = await open();
  await p.mouse.click(187, 760); await p.waitForTimeout(1300); const o2 = await open();
  const url = p.url();
  console.log('open after button', o1, '| open after tapping below the links', o2, '| still on', url.split('/').pop());
  const ok = o1 && !o2 && url.endsWith('index.html');
  console.log(ok ? 'PASS tap outside closes the menu' : 'FAIL'); console.log('errors', errs);
  await b.close(); srv.close(); process.exit(ok && !errs.length ? 0 : 1); })();
