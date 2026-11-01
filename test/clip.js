// Regression: .service-5-item-list-item rows (home "Place / Service / Area" lists) must end full width.
// They used to get a fade batch tween with overwrite:true that killed their clip-path wipe halfway.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LIST = '<section style="padding:120vh 40px 60vh"><div class="service-5-item-desc" style="width:700px">' +
  ['(01) Place', '(02) Service', '(03) Area'].map(t => '<div class="service-5-item-list-item" style="border-top:1px solid #b5b5b5;padding:10px 0"><div class="text-block">' + t + '</div></div>').join('') +
  '</div></section>';
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u === '/' ? 'index.html' : u);
  fs.readFile(f, 'utf8', (e, d) => { if (e) { r.writeHead(404); return r.end(); } if (f.endsWith('index.html')) d = d.replace('</main>', LIST + '</main>'); r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4581);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4581/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const d = document.querySelector('.service-5-item-desc'); klLenis.scrollTo(d.getBoundingClientRect().top + scrollY - innerHeight * 0.5, { immediate: true }); });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [...document.querySelectorAll('.service-5-item-list-item')].map(e => ({ w: Math.round(e.getBoundingClientRect().width), clip: getComputedStyle(e).clipPath, op: getComputedStyle(e).opacity })));
  console.log('rows', JSON.stringify(r));
  const ok = r.length === 3 && r.every(x => x.clip === 'none' && x.op === '1' && x.w === 700);
  console.log(ok ? 'PASS rows end full width, no clip left' : 'FAIL'); console.log('errors', errs);
  await b.close(); srv.close(); process.exit(ok && !errs.length ? 0 : 1); })();
