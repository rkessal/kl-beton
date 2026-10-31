// Image reveal: clip-path mask and the 1.1 -> 1 scale start and end together.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4573);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4573/service.html'); await p.waitForTimeout(1500);
  const y = await p.evaluate(() => document.querySelector('.service-item-image').getBoundingClientRect().top + scrollY);
  await p.evaluate(() => { window.__s = []; const w = document.querySelector('.service-item-image'), img = w.querySelector('img'); const t0 = performance.now(); const tick = () => { const m = new DOMMatrix(getComputedStyle(img).transform); window.__s.push([Math.round(performance.now() - t0), getComputedStyle(w).clipPath, +(Math.hypot(m.a, m.b) / 1.18).toFixed(3)]); if (performance.now() - t0 < 2200) requestAnimationFrame(tick); }; tick(); });
  await p.evaluate(y => klLenis.scrollTo(y - 500, { immediate: true }), y);
  await p.waitForTimeout(2300);
  const s = await p.evaluate(() => window.__s);
  const first = s.find(x => x[2] < 1.099), lastScale = s.find(x => x[2] <= 1.0005), lastClip = s.find(x => x[1] === 'inset(0%)' || x[1] === 'inset(0% 0% 0% 0%)');
  console.log('start   ', JSON.stringify(s[0]));
  console.log('mid     ', JSON.stringify(s[Math.floor(s.length / 3)]));
  console.log('scale starts moving at', first && first[0], 'ms; reaches 1.0 at', lastScale && lastScale[0], 'ms; mask fully open at', lastClip && lastClip[0], 'ms');
  console.log('errors', errs); await b.close(); srv.close(); })();
