const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); 
  for (const w of [1440, 390]) {
    const p=await b.newPage({viewport:{width:w,height:900}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    await p.goto('file://'+process.cwd()+'/test/index.html'); await p.waitForTimeout(2500);
    const r=await p.evaluate(()=>({ready:window.klAnimReady, lenis:!!window.klLenis, lines:document.querySelectorAll('.kl-line').length,
      roll:document.querySelectorAll('.button .kl-roll-b').length, icon2:document.querySelectorAll('.kl-icon-2').length,
      fill:document.querySelectorAll('.kl-fill').length, h1vis:getComputedStyle(document.querySelector('.hero h1')).visibility,
      clip:getComputedStyle(document.querySelector('.service-item-image')).clipPath}));
    console.log(w, JSON.stringify(r), errs);
    if (w===390){
      await p.click('.kl-menu-btn'); await p.waitForTimeout(1200);
      const o=await p.evaluate(()=>({open:document.querySelector('.navbar').classList.contains('kl-menu-open'),old:window.__oldToggle||0,
        disp:getComputedStyle(document.querySelector('.kl-nav-item')).display, op:getComputedStyle(document.querySelector('.kl-nav-item')).opacity}));
      await p.click('.kl-menu-btn'); await p.waitForTimeout(1300);
      const c=await p.evaluate(()=>document.querySelector('.navbar').classList.contains('kl-menu-open'));
      console.log('menu',JSON.stringify(o),'closed:',!c);
    } else {
      await p.hover('.button'); await p.waitForTimeout(700); const roll=await p.evaluate(()=>getComputedStyle(document.querySelector('.kl-roll-a')).transform); console.log('btn roll',roll); await p.mouse.wheel(0,4000); await p.waitForTimeout(2000); await p.hover('.faq-list-item'); await p.waitForTimeout(700);
      const h=await p.evaluate(()=>({op2:getComputedStyle(document.querySelectorAll('.faq-list-item')[1]).opacity, roll:getComputedStyle(document.querySelector('.kl-roll-a')).transform}));
      await p.mouse.wheel(0,1500); await p.waitForTimeout(1500);
      const s=await p.evaluate(()=>({y:scrollY, clip:getComputedStyle(document.querySelector('.service-item-image')).clipPath}));
      console.log('hover',JSON.stringify(h),'scroll',JSON.stringify(s));
      await p.screenshot({path:'test/desk.png'});
    }
  }
  await b.close();
})();
