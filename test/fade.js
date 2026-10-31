// Scroll text fade: letters scrub 0.5 -> 1, first lines fill before later lines, no mask wrappers.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4574);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4574/service.html'); await p.waitForTimeout(1500);
  const top = await p.evaluate(() => document.querySelector('.service-overview-text').getBoundingClientRect().top + scrollY);
  const read = () => p.evaluate(() => { const lines = [...document.querySelectorAll('.service-overview-text .kl-fade-line')]; return { masks: document.querySelectorAll('.service-overview-text [class*=mask]').length, lines: lines.map(l => { const o = [...l.querySelectorAll('.kl-fade-char')].map(c => +getComputedStyle(c).opacity); return (o.reduce((a, b) => a + b, 0) / o.length).toFixed(2); }).join(' ') }; });
  for (const at of [0.95, 0.7, 0.5, 0.3]) { await p.evaluate(([y, f]) => klLenis.scrollTo(y - innerHeight * f, { immediate: true }), [top, at]); await p.waitForTimeout(900); console.log('top at ' + Math.round(at * 100) + '% of screen -> line averages', JSON.stringify(await read())); }
  await p.screenshot({ path: __dirname + '/fade.png' });
  console.log('errors', errs); await b.close(); srv.close(); })();
