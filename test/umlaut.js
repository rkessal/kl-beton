// Umlauts/accents above the line box must not be clipped by the line masks.
// Measures how far the glyph ink rises above each mask box (TextMetrics) vs the mask's clip-path top.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HEAD = fs.readFileSync(path.join(ROOT, 'webflow/site-head.html'), 'utf8');
const PAGE = `<!doctype html><html><head><meta charset="utf-8">${HEAD}<style>@font-face{font-family:IT;src:url(/test/fixtures/InterTight-VariableFont_wght.woff2)}h2{font:600 64px/67px IT;margin:0;width:500px}</style></head>
<body><main><h2 id="h">Über Größe ÄÖÜ Éclat</h2><div style="display:flex;align-items:center;height:40px;margin-top:40px"><div class="button-text kl-roll" style="font:600 15px/15px IT;text-transform:uppercase"><span class="kl-roll-a">Häufige Fragen</span><span class="kl-roll-b">Häufige Fragen</span></div></div></main>
<script src="/node_modules/gsap/dist/gsap.min.js"></script><script src="/node_modules/gsap/dist/SplitText.min.js"></script>
<script>gsap.registerPlugin(SplitText);document.fonts.ready.then(()=>{const s=new SplitText('#h',{type:'lines',mask:'lines',linesClass:'kl-line'});window.done=1})</script></body></html>`;
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(PAGE); }
  fs.readFile(path.join(ROOT, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); }); }).listen(4583);
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('http://localhost:4583/'); await p.waitForFunction('window.done');
  const r = await p.evaluate(() => { const cv = document.createElement('canvas').getContext('2d'); cv.font = '600 64px IT';
    return [...document.querySelectorAll('.kl-line-mask')].map(m => { const cs = getComputedStyle(m); const box = m.getBoundingClientRect(); const line = m.querySelector('.kl-line');
      const txt = line.textContent; const tm = cv.measureText(txt); const lr = line.getBoundingClientRect();
      // baseline ≈ line top + half-leading + fontBoundingBoxAscent
      const half = (67 - (tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent)) / 2; const baseline = lr.top + half + tm.fontBoundingBoxAscent;
      const inkTop = baseline - tm.actualBoundingBoxAscent; const clipTop = box.top - parseFloat(cs.clipPath.match(/inset\((-?[\d.]+)px/)[1]) * -1;
      return { txt, inkAboveBox: +(box.top - inkTop).toFixed(1), clip: cs.clipPath, clipTop: +clipTop.toFixed(1), inkTop: +inkTop.toFixed(1), ok: inkTop >= clipTop }; }); });
  const btn = await p.evaluate(() => { const cv = document.createElement('canvas').getContext('2d'); cv.font = '600 15px IT';
    const roll = document.querySelector('.kl-roll').getBoundingClientRect(); const tm = cv.measureText('HÄUFIGE FRAGEN'); const half = (15 - (tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent)) / 2;
    const ink = el => { const r = el.getBoundingClientRect(); const pt = parseFloat(getComputedStyle(el).paddingTop); return r.top + pt + half + tm.fontBoundingBoxAscent - tm.actualBoundingBoxAscent; };
    const a = ink(document.querySelector('.kl-roll-a')), b = ink(document.querySelector('.kl-roll-b'));
    return { rollTop: +roll.top.toFixed(1), rollBottom: +roll.bottom.toFixed(1), visibleInk: +a.toFixed(1), hiddenInk: +b.toFixed(1), ok: a >= roll.top && b >= roll.bottom }; });
  console.log('button roll', JSON.stringify(btn));
  console.log(JSON.stringify(r, null, 1)); const ok = r.length && r.every(x => x.ok) && btn.ok; console.log(ok ? 'PASS umlauts inside the masks and button rolls' : 'FAIL'); await b.close(); srv.close(); process.exit(ok ? 0 : 1); })();
