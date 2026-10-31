// Before the stack starts no dark may be visible; cards are full width and >= 1 screen tall.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4570);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  await p.goto('http://localhost:4570/service.html'); await p.waitForTimeout(1500);
  const y = await p.evaluate(() => document.querySelector('.service-list').getBoundingClientRect().top + scrollY);
  const info = () => p.evaluate(() => { const c = [...document.querySelectorAll('.service-item-1')]; const r = c[0].getBoundingClientRect(), cs = getComputedStyle(c[0]); return { cardLeft: Math.round(r.left), cardWidth: Math.round(r.width), vw: innerWidth, cardH: Math.round(c[1].offsetHeight), vh: innerHeight, padL: cs.paddingLeft, bg: cs.backgroundColor }; });
  await p.evaluate(y => klLenis.scrollTo(y - 300, { immediate: true }), y); await p.waitForTimeout(600);
  console.log('before stack', JSON.stringify(await info())); await p.screenshot({ path: __dirname + '/before.png' });
  await p.evaluate(y => klLenis.scrollTo(y + innerHeight * 0.6, { immediate: true }), y); await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/stack.png' }); await b.close(); srv.close(); })();
