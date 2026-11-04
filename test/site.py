"""Builds a 2-page mock (home + service) in test/site/ using the real head/footer snippets,
with local copies of the libraries instead of the CDN."""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
out = os.path.join(here, 'site'); os.makedirs(out, exist_ok=True)
head = open(os.path.join(root, 'webflow/site-head.html')).read()
nm = '/node_modules'
libs = ''.join(f'<script src="{nm}/{p}"></script>' for p in [
  'gsap/dist/gsap.min.js', 'gsap/dist/ScrollTrigger.min.js', 'gsap/dist/SplitText.min.js',
  'gsap/dist/CustomEase.min.js', 'lenis/dist/lenis.min.js', '@barba/core/dist/barba.umd.js'])
menu = """<style>.kl-menu-btn{display:none}@media (max-width:991px){.kl-nav-item{display:none!important}.kl-menu-btn{display:flex}.kl-menu-open .kl-nav-item{display:flex!important}}</style>
<script>(function(){function init(){var nav=document.querySelector('.navbar');if(!nav||nav.querySelector('.kl-menu-btn'))return;var l=nav.querySelectorAll('.nav-link');for(var i=1;i<l.length;i++)l[i].classList.add('kl-nav-item');var b=document.createElement('button');b.className='kl-menu-btn';b.textContent='Menu';l[0].after(b);b.addEventListener('click',function(){nav.classList.toggle('kl-menu-open');window.__old=(window.__old||0)+1;});}window.klMenuInit=init;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();</script>"""
nav = ('<div class="navbar" style="position:fixed;top:5px;display:flex;gap:0;width:100%;z-index:99">'
       '<a class="nav-link" href="/index.html" style="background:#fff">LOGO</a>'
       '<a class="nav-link" href="/service.html" style="background:#fff;display:flex;width:200px;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e1e2e0">Fassade<span class="nav-link-dot" style="width:4px;height:4px;background:#b5b5b5"></span></a>'
       '<a class="nav-link" href="/index.html" style="background:#fff;display:flex;width:200px;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e1e2e0">Home<span class="nav-link-dot" style="width:4px;height:4px;background:#b5b5b5"></span></a>'
       '<a class="nav-link" href="/service.html" style="background:#105ba4;color:#fff">Projekt anfragen</a></div>')
footer = '<footer class="footer"><a class="footer-main-list-item" href="/index.html"><div class="text-block">Startseite</div></a></footer>'
def page(ns, body):
    return f"""<!doctype html><html data-wf-page="{ns}-id"><head><meta charset="utf-8">{head}
<style>body{{margin:0;background:#ededed;font:16px sans-serif}}section:not(.service-list){{padding:40px}}</style></head>
<body data-barba="wrapper"><main data-barba="container" data-barba-namespace="{ns}">{nav}{body}{footer}</main>
{menu}{libs}<script src="/dist/kl-anim.min.js"></script></body></html>"""
home = """<section class="hero" style="height:100vh"><h1 class="heading">Fassaden- und Betonsanierung für Hausverwaltungen</h1>
<div class="button" style="position:relative;display:inline-flex;gap:8px;padding:10px"><a class="button-element" href="/service.html" style="position:absolute;inset:0;opacity:0;z-index:3">Zur Fassade</a><img class="btn-icon" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="width:16px;height:16px"><div class="button-text">Zur Fassade</div></div></section>
<section class="service-5"><div class="service-5-testimonials-wrapper"><div class="service-5-testimonials-inner"><div data-kl-track>
<div class="service-5-testimonials-text"><div class="text-block">AUTHOR ONE</div><div class="text-block">Quote one</div></div>
<div class="service-5-testimonials-text"><div class="text-block">AUTHOR TWO</div><div class="text-block">Quote two</div></div></div>
<div class="service-5-testimonials-indicators"><div class="service-5-testimonials-indicators-item filled"></div></div></div>
<div class="service-5-testimonials-buttons"><div class="service-5-testimonials-button">prev</div><div class="service-5-testimonials-button">next</div></div></div></section>"""
cards = ''.join(f'<article class="service-item-1" style="position:relative;padding-top:120px;padding-bottom:120px;border-top:1px solid #ccc"><h2>SERVICE {i}</h2><div class="text-block">Beschreibung der Leistung Nummer {i}.</div><figure class="service-item-image" style="height:{300 if i % 2 else 60}px;background:#999"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="width:100%;height:100%"></figure></article>' for i in range(1,5))
service = f"""<section class="service-hero" style="height:80vh"><h1>Fassade und Außensanierung</h1><a href="#faq" class="nav-anchor">Häufige Fragen</a></section>
<section class="service-overview" style="padding:120px 20px"><div class="service-overview-text" style="max-width:550px;margin:auto;text-align:center"><div class="text-block" style="font-size:32px;line-height:38px">Wir sanieren Fassaden und Betonbauteile an Wohnanlagen, Gewerbeobjekten und Bestandsgebäuden im Raum München. Unsere Auftraggeber sind überwiegend Hausverwaltungen und Ingenieurbüros.</div></div></section>
<section class="service-list" style="padding:0 20px;background:#fff">{cards}</section><div class="service-logos" style="display:flex;flex-wrap:wrap;border-top:1px solid #ccc;border-bottom:1px solid #ccc"><figure class="service-logo-cell" style="display:flex;width:25%;height:160px;margin:0;padding:0 20px;justify-content:center;align-items:center;border-left:1px solid #ccc;box-sizing:border-box">LOGO 1</figure><figure class="service-logo-cell" style="display:flex;width:25%;height:160px;margin:0;padding:0 20px;justify-content:center;align-items:center;border-left:1px solid #ccc;box-sizing:border-box">LOGO 2</figure><figure class="service-logo-cell" style="display:flex;width:25%;height:160px;margin:0;padding:0 20px;justify-content:center;align-items:center;border-left:1px solid #ccc;box-sizing:border-box">LOGO 3</figure><figure class="service-logo-cell" style="display:flex;width:25%;height:160px;margin:0;padding:0 20px;justify-content:center;align-items:center;border-left:1px solid #ccc;box-sizing:border-box">LOGO 4</figure></div>
<section class="faq" id="faq" style="height:100vh"><h2>FAQ</h2></section>"""
open(os.path.join(out,'index.html'),'w').write(page('home', home))
open(os.path.join(out,'service.html'),'w').write(page('service', service))
print('built', out)
