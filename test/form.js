// Pages with a <form> must get a real page load (not a Barba swap): Webflow's form script and
// Turnstile only hook up on a fresh load. Uses a copy of the service page with a form added.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); const form = u === '/contact.html'; if (form) u = '/service.html';
  const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u === '/' ? 'index.html' : u);
  fs.readFile(f, 'utf8', (e, d) => { if (e) { r.writeHead(404); return r.end(); }
    if (form) d = d.replace('data-barba-namespace="service"', 'data-barba-namespace="contact"').replace('</main>', '<form id="kf"><input name="n"></form></main>');
    r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4587);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4587/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__sameDoc = 1; });
  await p.evaluate(() => { barba.go('/service.html'); }); await p.waitForTimeout(3500);
  const svc = await p.evaluate(() => ({ url: location.pathname, sameDoc: window.__sameDoc === 1 }));
  await p.evaluate(() => { barba.go('/contact.html'); }); await p.waitForTimeout(3500);
  const ct = await p.evaluate(() => ({ url: location.pathname, sameDoc: window.__sameDoc === 1, form: !!document.querySelector('#kf'), ns: document.querySelector('[data-barba=container]').dataset.barbaNamespace }));
  const hist = await p.evaluate(() => history.length);
  console.log('no form ->', JSON.stringify(svc), ' form ->', JSON.stringify(ct), 'history', hist);
  const ok = svc.sameDoc && !ct.sameDoc && ct.form && ct.url === '/contact.html';
  console.log(ok ? 'PASS Barba swap for normal pages, fresh load for form pages' : 'FAIL'); console.log('errors', errs);
  await b.close(); srv.close(); process.exit(ok && !errs.length ? 0 : 1); })();
