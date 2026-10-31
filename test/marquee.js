// Logo marquee: one row, cells keep 25% width, track moves left continuously, edges fade, survives a Barba round trip.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4576);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4576/service.html'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => { const row = document.querySelector('.service-logos'), tr = row.querySelector('.kl-marquee-track'); const c = tr.children; return { rowW: row.clientWidth, cells: c.length, cellW: Math.round(c[0].getBoundingClientRect().width), x: Math.round(gsap.getProperty(tr, 'x')), mask: getComputedStyle(row).maskImage.slice(0, 40), rows: new Set([...c].map(x => Math.round(x.getBoundingClientRect().top))).size }; });
  const borders = await p.evaluate(() => [...document.querySelectorAll('.kl-marquee-track > *')].map(c => { const cs = getComputedStyle(c); return cs.borderRightWidth + '/' + cs.borderBottomWidth; }));
  console.log('cell right/bottom borders:', [...new Set(borders)].join(' '));
  const xs = []; for (let i = 0; i < 6; i++) { xs.push(await p.evaluate(() => getComputedStyle(document.querySelector('.kl-marquee-track')).transform)); await p.waitForTimeout(90); }
  console.log('transforms are whole pixels:', xs.every(t => Number.isInteger(+t.split(',')[4])), xs.slice(0, 3).join(' | '));
  const a = await st(); await p.waitForTimeout(1000); const b2 = await st();
  console.log('start', JSON.stringify(a)); console.log('+1s  ', JSON.stringify(b2), 'moved', a.x - b2.x, 'px');
  await p.setViewportSize({ width: 800, height: 800 }); await p.waitForTimeout(600); console.log('800px', JSON.stringify(await st()));
  await p.setViewportSize({ width: 1340, height: 800 }); await p.waitForTimeout(600);
  await p.click('.nav-link >> nth=2'); await p.waitForTimeout(2600); await p.click('.nav-link >> nth=1'); await p.waitForTimeout(2800);
  console.log('after barba round trip', JSON.stringify(await st()));
  console.log('errors', errs); await b.close(); srv.close(); })();
