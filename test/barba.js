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
  const cur = () => p.evaluate(() => [...document.querySelectorAll('.navbar .nav-link')].map(a => a.classList.contains('kl-current') ? '[' + a.textContent.trim() + ']' : a.textContent.trim()).join(' | ') + '  bg=' + ((document.querySelector('.kl-current') && getComputedStyle(document.querySelector('.kl-current')).backgroundColor) || '-'));
  console.log('home', JSON.stringify(await st())); console.log(' nav', await cur());
  await p.evaluate(() => klLenis.scrollTo(600, { immediate: true })); await p.waitForTimeout(300);
  await p.evaluate(() => klLenis.scrollTo(0, { immediate: true })); await p.waitForTimeout(300);
  await p.hover('.button'); await p.waitForTimeout(700);
  console.log(' top element after hover:', await p.evaluate(() => { const r = document.querySelector('.button').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el.className; }));
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
  console.log(' mid-transition', JSON.stringify(await p.evaluate(() => { const sc = getComputedStyle(document.querySelector('.kl-screen')); return { color: sc.backgroundColor, backdrop: sc.backdropFilter }; })));
  await p.waitForTimeout(2600);
  console.log('service', JSON.stringify(await st()), 'url', p.url());
  console.log(' nav', await cur());
  // stack: scroll so card 2 covers card 1
  const list = await p.evaluate(() => document.querySelector('.service-list').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => window.klLenis ? klLenis.scrollTo(y + innerHeight * 0.95, { immediate: true }) : scrollTo(0, y), list); await p.waitForTimeout(800);
  console.log(' stack', JSON.stringify(await p.evaluate(() => { const c = document.querySelectorAll('.service-item-1'); const t = getComputedStyle(c[0]).transform; return { cls: document.querySelector('.service-list').className, card1Transform: t, card1Top: Math.round(c[0].getBoundingClientRect().top), card2Top: Math.round(c[1].getBoundingClientRect().top), shade: getComputedStyle(c[0].querySelector('.kl-stack-shade')).opacity }; })));
  // anchor link must not trigger barba
  await p.evaluate(() => klLenis.scrollTo(0, { immediate: true })); await p.waitForTimeout(200);
  await p.click('.nav-anchor'); await p.waitForTimeout(1500);
  console.log(' anchor stays on page:', p.url().endsWith('/service.html#faq') || p.url().endsWith('/service.html'), p.url());
  // back to home via nav, then mobile menu after transition
  await p.evaluate(() => klLenis.scrollTo(1500, { immediate: true })); await p.waitForTimeout(400);
  const navTop = () => p.evaluate(() => Math.round(document.querySelector('.navbar').getBoundingClientRect().top));
  const before = await navTop();
  await p.evaluate(() => { window.__navMiss = 0; window.__navCovered = 0; const tick = () => { const n = document.querySelector('.navbar'); if (!n) window.__navMiss++; else { const r = n.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 5, r.top + r.height / 2); if (!el || !el.closest('.navbar')) window.__navCovered++; } window.__navRaf = requestAnimationFrame(tick); }; tick(); });
  await p.click('.nav-link >> nth=2'); const samples = [];
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(120); samples.push(await navTop()); }
  console.log(' navbar top while leaving a scrolled page:', before, '->', samples.join(','));
  await p.waitForTimeout(1200);
  console.log(' frames without navbar:', await p.evaluate(() => window.__navMiss), ' frames navbar covered:', await p.evaluate(() => { cancelAnimationFrame(window.__navRaf); return window.__navCovered; }));
  await p.waitForTimeout(1500);
  console.log('home again', JSON.stringify(await st()));
  console.log(' nav', await cur());
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(400);
  await p.click('.kl-menu-btn'); await p.waitForTimeout(1200);
  console.log(' menu', JSON.stringify(await p.evaluate(() => ({ open: document.querySelector('.navbar').classList.contains('kl-menu-open'), oldToggle: window.__old || 0, items: getComputedStyle(document.querySelector('.kl-nav-item')).opacity }))));
  await p.click('.kl-nav-item >> nth=0'); await p.waitForTimeout(2500);
  console.log('after menu nav', JSON.stringify(await st()), 'menuOpen', await p.evaluate(() => document.querySelector('.navbar').classList.contains('kl-menu-open')));
  console.log('errors', errs);
  await b.close(); srv.close();
})();
