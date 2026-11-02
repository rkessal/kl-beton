// Regression: hovering the FAQ while its rows are still rising must not freeze them mid-way
// (the dim tween used overwrite:true and killed the rise, leaving rows shifted into each other).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FAQ = '<section style="padding:120vh 40px 80vh"><div class="faq-questions-list" style="width:900px">' +
  [1, 2, 3, 4, 5].map(i => '<div class="faq-list-item" style="display:flex;border-top:1px solid #444;padding:20px 0"><div class="faq-list-title" style="width:50%">' + i + '. Frage</div><div class="faq-list-desc">Antwort ' + i + '</div></div>').join('') +
  '</div></section>';
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u === '/' ? 'index.html' : u);
  fs.readFile(f, 'utf8', (e, d) => { if (e) { r.writeHead(404); return r.end(); } if (f.endsWith('index.html')) d = d.replace('</main>', FAQ + '</main>'); r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4585);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4585/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const d = document.querySelector('.faq-questions-list'); klLenis.scrollTo(d.getBoundingClientRect().top + scrollY - 150, { immediate: true }); });
  await p.waitForTimeout(150); // rows are rising now: sweep the mouse over them
  for (const i of [0, 1, 2, 3, 4]) { const box = await p.locator('.faq-list-item').nth(i).boundingBox(); await p.mouse.move(box.x + 100, box.y + box.height / 2); await p.waitForTimeout(60); }
  await p.mouse.move(5, 5); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [...document.querySelectorAll('.faq-list-item')].map(e => { const m = getComputedStyle(e).transform; return { y: m === 'none' ? 0 : +m.split(',')[5].replace(')', ''), op: +getComputedStyle(e).opacity }; }));
  console.log('rows', JSON.stringify(r)); const ok = r.every(x => Math.abs(x.y) < 0.5 && x.op === 1);
  console.log(ok ? 'PASS FAQ rows settle at y=0 after hovering mid-rise' : 'FAIL'); console.log('errors', errs);
  await b.close(); srv.close(); process.exit(ok && !errs.length ? 0 : 1); })();
