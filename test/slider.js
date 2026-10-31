const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const reduce of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(1500);
    const state = () => p.evaluate(() => ({
      dots: document.querySelectorAll('.service-5-testimonials-indicators-item').length,
      filled: [...document.querySelectorAll('.service-5-testimonials-indicators-item')].findIndex(d => d.classList.contains('filled')),
      shown: [...document.querySelectorAll('[data-kl-track] > *')].map(s => getComputedStyle(s).opacity),
    }));
    console.log(reduce ? 'reduced' : 'anim', 'start', JSON.stringify(await state()));
    await p.click('.service-5-testimonials-button >> nth=1'); await p.waitForTimeout(2000);
    console.log(' next', JSON.stringify(await state()));
    await p.click('.service-5-testimonials-button >> nth=0'); await p.waitForTimeout(2000);
    await p.click('.service-5-testimonials-button >> nth=0'); await p.waitForTimeout(2000);
    console.log(' prev x2 (wraps)', JSON.stringify(await state()), errs);
  }
  await b.close();
})();
