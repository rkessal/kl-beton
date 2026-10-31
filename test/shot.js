const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4568);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  await p.goto('http://localhost:4568/service.html'); await p.waitForTimeout(1500);
  const y = await p.evaluate(() => document.querySelector('.service-list').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => klLenis.scrollTo(y + innerHeight * 0.55, { immediate: true }), y); await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/stack.png' }); await b.close(); srv.close(); })();
