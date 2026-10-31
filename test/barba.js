// Serves the repo root and checks Barba transitions, re-init, card stack and menu.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const map = p => p.startsWith('/node_modules/') ? path.join(ROOT, p) : p.startsWith('/dist/') ? path.join(ROOT, p) : path.join(__dirname, 'site', p === '/' ? 'index.html' : p);
const srv = http.createServer((q, r) => { const f = map(decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(4567);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:4567/index.html'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => ({ ns: document.querySelector('[data-barba="container"]').dataset.barbaNamespace, triggers: ScrollTrigger.getAll().length, lines: document.querySelectorAll('.kl-line').length, screen: getComputedStyle(document.querySelector('.kl-screen')).opacity, wf: document.documentElement.dataset.wfPage, ready: window.klAnimReady }));
  console.log('home', JSON.stringify(await st()));
  await p.click('.button'); await p.waitForTimeout(300);
  console.log(' mid-transition screen opacity', await p.evaluate(() => getComputedStyle(document.querySelector('.kl-screen')).opacity));
  await p.waitForTimeout(2000);
  console.log('service', JSON.stringify(await st()), 'url', p.url());
  // stack: scroll so card 2 covers card 1
  const list = await p.evaluate(() => document.querySelector('.service-list').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => window.klLenis ? klLenis.scrollTo(y + innerHeight * 0.95, { immediate: true }) : scrollTo(0, y), list); await p.waitForTimeout(800);
  console.log(' stack', JSON.stringify(await p.evaluate(() => { const c = document.querySelectorAll('.service-item-1'); const t = getComputedStyle(c[0]).transform; return { cls: document.querySelector('.service-list').className, card1Transform: t, card1Top: Math.round(c[0].getBoundingClientRect().top), card2Top: Math.round(c[1].getBoundingClientRect().top), shade: getComputedStyle(c[0].querySelector('.kl-stack-shade')).opacity }; })));
  // anchor link must not trigger barba
  await p.evaluate(() => klLenis.scrollTo(0, { immediate: true })); await p.waitForTimeout(200);
  await p.click('.nav-anchor'); await p.waitForTimeout(1500);
  console.log(' anchor stays on page:', p.url().endsWith('/service.html#faq') || p.url().endsWith('/service.html'), p.url());
  // back to home via nav, then mobile menu after transition
  await p.click('.nav-link >> nth=2'); await p.waitForTimeout(2500);
  console.log('home again', JSON.stringify(await st()));
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(400);
  await p.click('.kl-menu-btn'); await p.waitForTimeout(1200);
  console.log(' menu', JSON.stringify(await p.evaluate(() => ({ open: document.querySelector('.navbar').classList.contains('kl-menu-open'), oldToggle: window.__old || 0, items: getComputedStyle(document.querySelector('.kl-nav-item')).opacity }))));
  await p.click('.kl-nav-item >> nth=0'); await p.waitForTimeout(2500);
  console.log('after menu nav', JSON.stringify(await st()), 'menuOpen', await p.evaluate(() => document.querySelector('.navbar').classList.contains('kl-menu-open')));
  console.log('errors', errs);
  await b.close(); srv.close();
})();
