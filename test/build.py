head=open('webflow/site-head.html').read()
js=open('dist/kl-anim.min.js').read()
html=f"""<!doctype html><html><head>{head}</head><body>
<div class="navbar" style="position:fixed;top:5px;display:flex;width:100%;z-index:99"><a class="nav-link" href="/">LOGO</a><a class="nav-link" href="/a">Fassadensanierung</a><a class="nav-link" href="/b">Über uns</a></div>
<main>
<section class="hero" style="height:100vh;position:relative"><div class="hero-image" style="position:absolute;inset:0"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="width:100%;height:100%"></div><div class="hero-left" style="position:relative;z-index:2"><h1 class="heading">Fassaden- und Betonsanierung für Hausverwaltungen</h1><h2 class="sub-heading">Betonsanierung, Dämmung</h2>
<a class="button" href="/contact"><img class="btn-icon" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="width:18px;height:18px"><div class="button-text">Projekt anfragen</div></a></div>
<div class="hero-aside"><div class="hero-info">15 Mitarbeiter</div></div></section>
<section class="service-4"><ul class="service-4-article-list"><li class="service-4-article-list-item"><div class="service-4-article-list-title"><div class="text-block">Anfrage</div></div><div class="service-4-article-list-desc"><div class="text-block">Mit Leistungsverzeichnis</div></div></li></ul></section>
<figure class="service-item-image" style="height:400px"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></figure>
<section class="about-quality" style="height:900px"><div class="about-quality-line is-1"><h1 class="heading">Woran man</h1></div><div class="about-quality-line is-2"><h1 class="heading">gute Arbeit</h1></div></section>
<section class="service-5"><div class="service-5-testimonials-wrapper"><div class="service-5-testimonials-inner"><div data-kl-track><div class="service-5-testimonials-text"><div class="text-block">AUTHOR ONE</div><div class="text-block">Quote one</div></div><div class="service-5-testimonials-text"><div class="text-block">AUTHOR TWO</div><div class="text-block">Quote two</div></div><div class="service-5-testimonials-text"><div class="text-block">AUTHOR THREE</div><div class="text-block">Quote three</div></div></div><div class="service-5-testimonials-indicators"><div class="service-5-testimonials-indicators-item filled"></div><div class="service-5-testimonials-indicators-item"></div></div></div><div class="service-5-testimonials-buttons"><div class="service-5-testimonials-button"><a href="#">prev</a></div><div class="service-5-testimonials-button"><a href="#">next</a></div></div></div></section>
<section class="faq"><ul><li class="faq-list-item"><div class="faq-list-title"><div class="text-block">1. Frage?</div></div><div class="faq-list-desc"><div class="text-block">Antwort lang lang lang</div></div></li><li class="faq-list-item"><div class="faq-list-title"><div class="text-block">2. Frage?</div></div></li></ul></section>
</main>
<footer class="footer"><a class="footer-main-list-item" href="/"><div class="text-block">Startseite</div><div class="footer-main-list-item-dot"></div></a></footer>
<style>.kl-menu-btn{{display:none}}@media (max-width:991px){{.kl-nav-item{{display:none!important}}.kl-menu-btn{{display:flex}}.kl-menu-open .kl-nav-item{{display:flex!important}}}}</style>
<script>
(function(){{var nav=document.querySelector('.navbar');var l=nav.querySelectorAll('.nav-link');for(var i=1;i<l.length;i++)l[i].classList.add('kl-nav-item');var b=document.createElement('button');b.className='kl-menu-btn';b.textContent='Menu';l[0].after(b);b.addEventListener('click',function(){{nav.classList.toggle('kl-menu-open');window.__oldToggle=(window.__oldToggle||0)+1;}});}})();
</script>
<script src="../node_modules/gsap/dist/gsap.min.js"></script><script src="../node_modules/gsap/dist/ScrollTrigger.min.js"></script><script src="../node_modules/gsap/dist/SplitText.min.js"></script><script src="../node_modules/lenis/dist/lenis.min.js"></script>
<script>{js}</script></body></html>"""
open('test/index.html','w').write(html)
