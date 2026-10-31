// Click a nav link: it becomes active during page-out (roll back down, grey bg), old active fades out,
// the new page's navbar shows it active immediately (no white flash). Hover does nothing on the active link.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4572);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4572/index.html'); await p.waitForTimeout(1500);
  const info = () => p.evaluate(() => [...document.querySelectorAll('.navbar .nav-link')].slice(1, 3).map(a => { const t = a.querySelector('.kl-nav-a'); return a.textContent.trim().slice(0, 7) + (a.classList.contains('kl-current') ? '*' : '') + ' bg=' + getComputedStyle(a).backgroundColor.replace(/rgb\((\d+), (\d+), (\d+)\)/, '$1,$2,$3') + ' roll=' + (t ? Math.round(t.getBoundingClientRect().top - a.getBoundingClientRect().top) : '-'); }).join('  |  '));
  // hover the active link (Home) -> no roll
  await p.hover('.nav-link >> nth=2'); await p.waitForTimeout(800);
  console.log('hover active   ', await info());
  // hover Fassade -> rolls blue, then click it
  await p.hover('.nav-link >> nth=1'); await p.waitForTimeout(1100);
  console.log('hover Fassade  ', await info());
  await p.evaluate(() => { window.__log = []; const t0 = performance.now(); const tick = () => { const n = document.querySelectorAll('.navbar .nav-link')[1]; if (n) window.__log.push([Math.round(performance.now() - t0), getComputedStyle(n).backgroundColor, n.classList.contains('kl-current')]); if (performance.now() - t0 < 2600) requestAnimationFrame(tick); }; tick(); });
  await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(450); console.log('leaving 450ms  ', await info());
  await p.waitForTimeout(2300); console.log('new page       ', await info(), p.url());
  const log = await p.evaluate(() => window.__log);
  const white = log.filter(x => x[1] === 'rgb(255, 255, 255)' && x[0] > 700);
  console.log('frames where Fassade went white again after the swap:', white.length);
  await p.mouse.move(400, 500); await p.waitForTimeout(300); await p.hover('.nav-link >> nth=1'); await p.waitForTimeout(800);
  console.log('hover new active', await info());
  console.log('errors', errs); await b.close(); srv.close(); })();
