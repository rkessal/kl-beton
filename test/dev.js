// Checks the Webflow loader + `npm run dev` (no tunnel): dev code is used, live reload fires,
// ?kl-dev=off and non-tunnel URLs fall back to the published build.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const footer = fs.readFileSync(path.join(ROOT, 'webflow/site-footer.html'), 'utf8');
const loader = footer.slice(footer.indexOf('<!-- KL loader')).replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/rkessal\/kl-beton@[^']+/, '/dist/kl-anim.min.js');
const libs = ['gsap/dist/gsap.min.js', 'gsap/dist/ScrollTrigger.min.js', 'gsap/dist/SplitText.min.js', 'gsap/dist/CustomEase.min.js', 'lenis/dist/lenis.min.js'].map(p => `<script src="/node_modules/${p}"></script>`).join('');
const html = `<!doctype html><html><head>${fs.readFileSync(path.join(ROOT, 'webflow/site-head.html'), 'utf8')}</head><body><main><h1>Fassaden- und Betonsanierung</h1></main>${libs}${loader}</body></html>`;
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; if (u === '/' ) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(html); } fs.readFile(path.join(ROOT, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(d); }); }).listen(4569);
const dev = spawn('node', [path.join(ROOT, 'scripts/dev.js'), '--no-tunnel', '--port', '5179']);
(async () => {
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const src = () => p.evaluate(() => ({ scripts: [...document.scripts].map(s => s.src).filter(s => /kl-anim/.test(s)).map(s => s.replace(location.origin, '')), ready: !!window.klAnimReady, badge: (document.getElementById('kl-dev-badge') || {}).textContent || null }));
  await p.goto('http://localhost:4569/?kl-dev=http://localhost:5179'); await p.waitForTimeout(1500);
  console.log('dev      ', JSON.stringify(await src()));
  let reloaded = false; p.on('framenavigated', () => { reloaded = true; });
  const f = path.join(ROOT, 'src/kl-anim.js'); fs.utimesSync(f, new Date(), new Date()); fs.appendFileSync(f, ''); fs.writeFileSync(f, fs.readFileSync(f));
  await p.waitForTimeout(2500);
  console.log('reload on save:', reloaded);
  await p.goto('http://localhost:4569/'); await p.waitForTimeout(1200);
  console.log('remembered', JSON.stringify(await src()));
  await p.goto('http://localhost:4569/?kl-dev=off'); await p.waitForTimeout(1200);
  console.log('off      ', JSON.stringify(await src()));
  await p.goto('http://localhost:4569/?kl-dev=https://evil.example.com'); await p.waitForTimeout(1200);
  console.log('rejected ', JSON.stringify(await src()));
  dev.kill(); await p.goto('http://localhost:4569/?kl-dev=http://localhost:5179'); await p.waitForTimeout(1500);
  console.log('dev down ', JSON.stringify(await src()));
  console.log('errors', errs);
  await b.close(); srv.close();
})();
