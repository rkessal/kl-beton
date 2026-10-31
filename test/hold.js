// Stack hold: after card 1 pins, it stays untouched for ~50vh of scroll before card 2 starts covering it.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4575);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4575/service.html'); await p.waitForTimeout(1500);
  const y0 = await p.evaluate(() => document.querySelector('.service-item-1').getBoundingClientRect().top + scrollY);
  const st = () => p.evaluate(() => { const c = document.querySelectorAll('.service-item-1'); const m = new DOMMatrix(getComputedStyle(c[0]).transform); return { card1Top: Math.round(c[0].getBoundingClientRect().top), scale: +Math.hypot(m.a, m.b).toFixed(3), card2Top: Math.round(c[1].getBoundingClientRect().top) }; });
  for (const vh of [0, 0.25, 0.5, 0.75, 1.0, 1.3]) { await p.evaluate(([y, v]) => klLenis.scrollTo(y + innerHeight * v + (document.querySelector('.service-item-1').offsetHeight > innerHeight ? document.querySelector('.service-item-1').offsetHeight - innerHeight : 0), { immediate: true }), [y0, vh]); await p.waitForTimeout(500); console.log('scrolled ' + vh + ' screens past pin:', JSON.stringify(await st())); }
  console.log('errors', errs); await b.close(); srv.close(); })();
