// Stack: at every scroll position, the screen column under the pinned card must show a card, never the
// dark list backdrop (no hold gap, no sliver while the card shrinks). Checks short and tall cards.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u.startsWith('/node_modules/') || u.startsWith('/dist/') ? path.join(ROOT, u) : path.join(__dirname, 'site', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4592);
(async () => { const b = await chromium.launch(); let ok = true;
  for (const h of [900, 560]) { // cards are ~660px: shorter than 900, taller than 560
    const p = await b.newPage({ viewport: { width: 1340, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:4592/service.html'); await p.waitForTimeout(1500);
    const [y0, y1] = await p.evaluate(() => { const l = document.querySelector('.service-list'), c = [...l.querySelectorAll('.service-item-1')]; return [l.getBoundingClientRect().top + scrollY, c[c.length - 1].getBoundingClientRect().top + scrollY]; });
    let gaps = 0, samples = 0;
    for (let y = y0; y <= y1; y += 37) {
      await p.evaluate(v => klLenis.scrollTo(v, { immediate: true }), y); await p.waitForTimeout(60);
      const g = await p.evaluate(() => { let n = 0, s = 0; for (let f = 0.1; f < 0.98; f += 0.08) { const el = document.elementFromPoint(innerWidth / 2, innerHeight * f); if (!el || el.closest('.navbar')) continue; s++; if (!el.closest('.service-item-1') && el.closest('.service-list')) n++; } return [n, s]; });
      gaps += g[0]; samples += g[1];
    }
    console.log('viewport ' + h + 'px: backdrop hits ' + gaps + ' / ' + samples, errs); if (gaps || errs.length) ok = false; await p.close();
  }
  console.log(ok ? 'PASS no dark gap in the stack' : 'FAIL'); await b.close(); srv.close(); process.exit(ok ? 0 : 1); })();
