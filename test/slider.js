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
    if (!reduce) { await p.evaluate(() => document.querySelector('[data-kl-track]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500); } // let the first reveal finish
    await p.click('.service-5-testimonials-button >> nth=1');
    if (!reduce) { // end of the exit: outgoing lines must be fully above the mask's .35em headroom (umlaut fix)
      await p.waitForTimeout(470); // exit = 0.4s + 0.02s stagger per line
      const leak = await p.evaluate(() => { const s = document.querySelector('[data-kl-track] > *');
        return [...s.querySelectorAll('.kl-line')].map(l => { const m = l.parentElement.getBoundingClientRect(), r = l.getBoundingClientRect(), fs = parseFloat(getComputedStyle(l).fontSize);
          return +getComputedStyle(l).opacity > 0.01 ? +Math.max(0, r.bottom - (m.top - 0.35 * fs)).toFixed(1) : 0; }); }); // faded out counts as hidden
      console.log(' visible px of outgoing lines above mask', JSON.stringify(leak), leak.every(v => v < 0.5) ? 'PASS' : 'FAIL');
    }
    await p.waitForTimeout(2000);
    console.log(' next', JSON.stringify(await state()));
    await p.click('.service-5-testimonials-button >> nth=0'); await p.waitForTimeout(2000);
    await p.click('.service-5-testimonials-button >> nth=0'); await p.waitForTimeout(2000);
    console.log(' prev x2 (wraps)', JSON.stringify(await state()), errs);
  }
  await b.close();
})();
