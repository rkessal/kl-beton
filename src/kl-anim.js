/* KL Beton – GSAP + Lenis + Barba
 *
 * Loaded site-wide (Webflow > Site settings > Custom code > Footer).
 * Page markup Barba needs:
 *   <body data-barba="wrapper">
 *     <main data-barba="container" data-barba-namespace="home|about|...">
 *
 * Lifecycle
 *   boot()          once: eases, Lenis, menu, transition screen, Barba
 *   initPage(root)  every page (first load + after each transition), inside a gsap.context
 *   killPage()      before the old page is removed: reverts every tween, ScrollTrigger and SplitText
 */
(function () {
  'use strict';

  /* =====================================================================
     EASING – change these to restyle every animation.
     Curves taken from oharchitecture.com.au (Monolog):
       ease-secondary  0.16, 1, 0.35, 1   → nearly everything (text, images, hovers)
       ease-transition 0.76, 0, 0.24, 1   → clip-path wipes
       ease-menu       .7, 0, .22, 1      → menu panel
     ===================================================================== */
  var CURVES = {
    klSecondary: '0.16, 1, 0.35, 1',
    klTransition: '0.76, 0, 0.24, 1',
    klMenu: '.7, 0, .22, 1'
  };
  var hasCE = !!(window.gsap && window.CustomEase);
  if (hasCE) {
    window.gsap.registerPlugin(window.CustomEase);
    Object.keys(CURVES).forEach(function (k) { window.CustomEase.create(k, CURVES[k]); });
  }
  var E = window.KL_EASE || {
    reveal:  hasCE ? 'klSecondary'  : 'expo.out',     // text lines, rows, labels
    soft:    hasCE ? 'klSecondary'  : 'expo.out',     // hero / about image zoom
    mask:    hasCE ? 'klTransition' : 'power3.inOut', // image clip-path wipes
    menu:    hasCE ? 'klMenu'       : 'power3.inOut', // menu panel
    hover:   hasCE ? 'klSecondary'  : 'expo.out',     // buttons, row fills
    exit:    'power1.in',                             // things leaving
    page:    hasCE ? 'klSecondary'  : 'expo.out'      // page transition screen
  };
  /* Durations (OH: transitionSlider 1, transitionNormal .875, hero 1.8) */
  var D = window.KL_DUR || {
    text: 1, h1: 1.2, row: 1, img: 1.2, hero: 1.8, hover: 0.6,
    pageIn: 0.35, pageHold: 0.375, pageOut: 0.875
  };
  var STAGGER = 0.0825;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function done() { root.classList.remove('kl-anim'); }

  /* ---------- no GSAP / reduced motion: content visible, slider + Barba-free ---------- */
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    done();
    var boot0 = function () { initSliders(document, reduce ? null : window.gsap, null); };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot0) : boot0();
    window.klAnimReady = true;
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  gsap.registerPlugin(ST);
  if (Split) gsap.registerPlugin(Split);
  var isTouch = window.matchMedia('(hover: none)').matches;
  var lenis = null, ctx = null, screen = null, backdrop = null;
  var menu = { open: false, busy: false };

  /* =====================================================================
     ONCE
     ===================================================================== */
  function boot() {
    // Lenis (OH: duration .8)
    if (window.Lenis) {
      lenis = new window.Lenis({ duration: 0.8, anchors: true });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      window.klLenis = lenis;
    }

    // page transition screen + menu backdrop live outside the Barba container
    screen = document.createElement('div'); screen.className = 'kl-screen';
    backdrop = document.createElement('div'); backdrop.className = 'kl-menu-backdrop';
    document.body.appendChild(backdrop);
    document.body.appendChild(screen);

    bindMenu();

    var container = document.querySelector('[data-barba="container"]') || document;
    if (window.barba && document.querySelector('[data-barba="wrapper"]') && !inWebflowEditor()) {
      history.scrollRestoration = 'manual';
      window.barba.init({
        preventRunning: true,
        timeout: 7000,
        prevent: function (o) {
          var href = o.href || '', el = o.el;
          if (el && el.hasAttribute('data-barba-prevent')) return true;
          if (href.indexOf('#') !== -1 && href.split('#')[0] === location.href.split('#')[0]) return true; // same-page anchors
          return false;
        },
        transitions: [{
          name: 'kl-fade',
          once: function (data) { initPage(data.next.container); },
          leave: function () {
            closeMenu(true);
            lenis && lenis.stop();
            return gsap.timeline()
              .set(screen, { autoAlpha: 0 })
              .to(screen, { autoAlpha: 1, duration: D.pageIn, ease: E.page })
              .to({}, { duration: D.pageHold });
          },
          afterLeave: function (data) {
            killPage();
            // remove the old page now so the new one measures and initialises alone
            data.current.container && data.current.container.remove();
          },
          beforeEnter: function (data) {
            window.scrollTo(0, 0);
            lenis && lenis.scrollTo(0, { immediate: true, force: true });
            resetWebflow(data.next.html);
            window.klMenuInit && window.klMenuInit();
            initPage(data.next.container);
          },
          enter: function () {
            lenis && lenis.start();
            return gsap.to(screen, { autoAlpha: 0, duration: D.pageOut, ease: E.page });
          },
          after: function () { ST.refresh(); }
        }]
      });
    } else {
      initPage(container);
    }
    window.addEventListener('load', function () { ST.refresh(); });
  }

  function inWebflowEditor() {
    return /[?&]edit\b/.test(location.search) || document.documentElement.hasAttribute('data-wf-editor');
  }

  // Webflow interactions (dropdowns, IX2) need re-initialising after a swap
  function resetWebflow(html) {
    try {
      var m = /data-wf-page="([^"]+)"/.exec(html || '');
      if (m) root.setAttribute('data-wf-page', m[1]);
      if (window.Webflow) {
        window.Webflow.destroy && window.Webflow.destroy();
        window.Webflow.ready && window.Webflow.ready();
        var ix2 = window.Webflow.require && window.Webflow.require('ix2');
        ix2 && ix2.init && ix2.init();
      }
    } catch (e) { /* never block the transition */ }
  }

  function killPage() {
    if (ctx) { ctx.revert(); ctx = null; }
    ST.getAll().forEach(function (t) { t.kill(); });
  }

  /* =====================================================================
     EVERY PAGE
     ===================================================================== */
  function initPage(container) {
    killPage();
    var run = function () {
      ctx = gsap.context(function () { pageAnimations(container); }, container);
      done();
      ST.refresh();
      window.klAnimReady = true;
    };
    document.fonts && document.fonts.ready ? document.fonts.ready.then(run) : run();
  }

  var SKIP = '.navbar, .button, .button-2, .contact-submit, .faq-list-item, .footer-main-list-item, ' +
    '.footer-main-right-links-item, .service-4-article-list-item, .about-quality-line, .about-hero-word, ' +
    '.hero-info, .service-5-item-list-item, [data-kl-track], form, label';
  var IMG_WRAPS = '.service-hero-image, .service-item-image, .service-3-img, .service-5-item-image-wrapper, ' +
    '.cta-item-image-wrapper, .about-onsite-image, .contact-image';

  function pageAnimations(c) {
    var $ = function (s) { return q(s, c); };
    function inside(el, sel) { return !!el.closest(sel); }

    function splitReveal(el, o) {
      o = o || {};
      if (!Split) return fadeUp(el, o);
      var s = new Split(el, { type: 'lines', mask: 'lines', linesClass: 'kl-line' });
      gsap.set(el, { visibility: 'visible' });
      gsap.from(s.lines, {
        yPercent: 120, rotate: 0.001, duration: o.d || D.text, ease: E.reveal, stagger: o.stagger || STAGGER, delay: o.delay || 0,
        scrollTrigger: o.noST ? null : { trigger: el, start: 'top 88%', once: true }
      });
    }
    function fadeUp(el, o) {
      o = o || {};
      gsap.set(el, { visibility: 'visible' });
      gsap.from(el, {
        y: 24, autoAlpha: 0, duration: D.text, ease: E.reveal, delay: o.delay || 0,
        scrollTrigger: o.noST ? null : { trigger: el, start: 'top 92%', once: true }
      });
    }

    /* ---------- text reveals ---------- */
    $('h1, h2, .text-block').forEach(function (el) {
      if (inside(el, SKIP) || el.closest('.footer')) { gsap.set(el, { visibility: 'visible' }); return; }
      var txt = (el.textContent || '').trim();
      if (!txt) { gsap.set(el, { visibility: 'visible' }); return; }
      if (/^\(.*\)$/.test(txt) || txt.length < 4) fadeUp(el); // small labels like (SERVICES)
      else splitReveal(el, el.tagName === 'H1' ? { d: D.h1 } : {});
    });

    /* ---------- image mask reveal + parallax ---------- */
    $(IMG_WRAPS).forEach(function (w) {
      if (w.tagName === 'IMG') w = w.parentElement;
      if (w.closest('.kl-stack')) return; // stacked service cards handle their own motion
      var img = w.querySelector('img'); if (!img) return;
      w.style.overflow = 'hidden';
      gsap.fromTo(w, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: D.img, ease: E.mask,
        scrollTrigger: { trigger: w, start: 'top 90%', once: true }
      });
      gsap.set(img, { scale: 1.18, transformOrigin: '50% 50%' });
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* Home hero: slow zoom-out + parallax */
    $('.hero-image img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.25 }, { scale: 1.08, duration: D.hero, ease: E.soft });
      gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('.hero') || img, start: 'top top', end: 'bottom top', scrub: true } });
    });
    $('.hero-aside').forEach(function (el) {
      gsap.from(el, { y: 40, autoAlpha: 0, duration: D.text, ease: E.reveal, delay: 0.4 });
      gsap.from(q('.hero-info', el), { y: 16, autoAlpha: 0, duration: D.text, ease: E.reveal, stagger: STAGGER, delay: 0.55 });
    });

    /* ---------- buttons: text roll + arrow swap ---------- */
    $('.button, .button-2, .contact-submit').forEach(function (b) {
      var t = b.querySelector('.button-text, .button-text-light, .contact-submit-button');
      var icon = b.querySelector('.btn-icon, .contact-submit-icon svg, .contact-submit-icon img, img');
      if (t && t.tagName !== 'INPUT' && !t.dataset.klRoll) {
        t.dataset.klRoll = '1';
        var label = t.textContent;
        t.innerHTML = '';
        t.classList.add('kl-roll');
        var a = document.createElement('span'), d = document.createElement('span');
        a.className = 'kl-roll-a'; d.className = 'kl-roll-b';
        a.textContent = d.textContent = label;
        d.setAttribute('aria-hidden', 'true');
        t.appendChild(a); t.appendChild(d);
      }
      var icon2 = b.querySelector('.kl-icon-2');
      if (icon && !icon2 && icon.parentElement) {
        var wrap = document.createElement('span'); wrap.className = 'kl-icon';
        icon.parentElement.insertBefore(wrap, icon);
        wrap.appendChild(icon);
        icon2 = icon.cloneNode(true); icon2.classList.add('kl-icon-2'); icon2.setAttribute('aria-hidden', 'true');
        wrap.appendChild(icon2);
      }
      if (isTouch) return;
      var tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: E.hover } });
      var rolls = q('.kl-roll-a, .kl-roll-b', b);
      if (rolls.length) tl.to(rolls, { yPercent: -100 }, 0);
      if (icon2) tl.fromTo(icon, { x: 0, y: 0 }, { x: '120%', y: '-120%' }, 0)
                   .fromTo(icon2, { x: '-120%', y: '120%' }, { x: 0, y: 0 }, 0);
      b.addEventListener('mouseenter', function () { tl.play(); });
      b.addEventListener('mouseleave', function () { tl.reverse(); });
    });

    /* ---------- row hovers (FAQ, footer, process list) ---------- */
    function addFill(el, cls) {
      var f = el.querySelector(':scope > .kl-fill');
      if (f) return f;
      f = document.createElement('span'); f.className = 'kl-fill ' + (cls || '');
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.insertBefore(f, el.firstChild);
      return f;
    }
    function rowGroup(sel, o) {
      var rows = $(sel); if (!rows.length || isTouch) return;
      rows.forEach(function (r) {
        var fill = o.fill ? addFill(r, o.fill) : null;
        var shift = o.shift ? q(o.shift, r) : [];
        r.addEventListener('mouseenter', function () {
          if (fill) gsap.to(fill, { scaleY: 1, duration: D.hover, ease: E.hover, overwrite: true });
          if (shift.length) gsap.to(shift, { x: o.dx || 14, duration: D.hover, ease: E.hover, overwrite: true });
          if (o.dim) gsap.to(rows.filter(function (x) { return x !== r; }), { opacity: 0.35, duration: 0.4, overwrite: true });
          if (o.color) r.classList.add('kl-hover');
        });
        r.addEventListener('mouseleave', function () {
          if (fill) gsap.to(fill, { scaleY: 0, duration: D.hover, ease: E.hover, overwrite: true });
          if (shift.length) gsap.to(shift, { x: 0, duration: D.hover, ease: E.hover, overwrite: true });
          if (o.dim) gsap.to(rows, { opacity: 1, duration: 0.4, overwrite: true });
          if (o.color) r.classList.remove('kl-hover');
        });
      });
    }
    rowGroup('.faq-list-item', { dim: true, shift: '.faq-list-title', dx: 16 });
    rowGroup('.service-4-article-list-item', { fill: 'kl-fill-brand', color: true });
    rowGroup('.footer-main-list-item', { fill: 'kl-fill-dark', color: true, shift: '.text-block', dx: 12 });
    rowGroup('.footer-main-right-links-item', { shift: '.text-block', dx: 10 });

    /* list rows appear */
    ['.faq-list-item', '.service-4-article-list-item', '.service-5-item-list-item', '.footer-main-list-item',
     '.footer-main-right-links-item', '.about-compare-row', '.contact-details-item'].forEach(function (sel) {
      var rows = $(sel); if (!rows.length) return;
      gsap.set(rows, { y: 30, autoAlpha: 0 });
      ST.batch(rows, {
        start: 'top 94%', once: true,
        onEnter: function (b) { gsap.to(b, { y: 0, autoAlpha: 1, duration: D.row, ease: E.reveal, stagger: STAGGER, overwrite: true }); }
      });
    });

    /* project descriptions */
    $('.service-5-item-desc').forEach(function (d) {
      var items = q('.service-5-item-list-item', d);
      if (items.length) gsap.from(items, {
        clipPath: 'inset(0 100% 0 0)', duration: D.row, ease: E.reveal, stagger: 0.1,
        scrollTrigger: { trigger: d, start: 'top 85%', once: true }
      });
    });

    /* ---------- About hero ---------- */
    $('.about-hero').forEach(function (h) {
      q('.about-hero-word', h).forEach(function (w, i) {
        var target = w.querySelector('h1, h2, .text-block') || w;
        if (Split) {
          var s = new Split(target, { type: 'lines', mask: 'lines' });
          gsap.set(target, { visibility: 'visible' });
          gsap.from(s.lines, { yPercent: 120, rotate: 0.001, duration: D.h1, ease: E.reveal, delay: 0.15 + i * 0.1 });
        } else fadeUp(target, { noST: true, delay: i * 0.12 });
      });
      var bar = h.querySelector('.about-hero-bar');
      if (bar) gsap.from(bar, { scaleX: 0, transformOrigin: '0 50%', duration: D.img, ease: E.mask, delay: 0.5 });
      var img = h.querySelector('.about-hero-image');
      if (img) {
        gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: D.img, ease: E.mask, delay: 0.6 });
        var im = img.querySelector('img');
        if (im) gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: D.hero, ease: E.soft, delay: 0.6 });
      }
    });

    /* ---------- About "Woran man gute Arbeit später erkennt" ---------- */
    $('.about-quality').forEach(function (qq) {
      q('.about-quality-line', qq).forEach(function (l, i) {
        var t = l.querySelector('h1, h2, .text-block') || l;
        gsap.set(t, { visibility: 'visible' });
        gsap.fromTo(l, { xPercent: i % 2 ? 18 : -18 }, {
          xPercent: 0, ease: 'none',
          scrollTrigger: { trigger: qq, start: 'top 85%', end: 'top 15%', scrub: 1 }
        });
        if (Split) {
          var s = new Split(t, { type: 'chars', mask: 'chars' });
          gsap.from(s.chars, {
            yPercent: 120, duration: D.text, ease: E.reveal, stagger: 0.02, delay: i * 0.08,
            scrollTrigger: { trigger: qq, start: 'top 75%', once: true }
          });
        }
      });
      var logo = qq.querySelector('.about-quality-logo');
      if (logo) gsap.from(logo, { y: 30, autoAlpha: 0, duration: D.text, ease: E.reveal, scrollTrigger: { trigger: logo, start: 'top 95%', once: true } });
    });

    /* ---------- dots ---------- */
    $('.service-dot, .contact-label-dot, .contact-details-dot, .footer-main-list-item-dot').forEach(function (d) {
      if (inside(d, '.navbar')) return;
      gsap.from(d, { scale: 0, duration: 0.6, ease: 'back.out(3)', scrollTrigger: { trigger: d, start: 'top 95%', once: true } });
    });

    initServiceStack(c);
    initSliders(c, gsap, Split);
  }

  /* =====================================================================
     SERVICE LIST – stacked cards
     Each card pins while the next one slides up over it; the pinned card
     shrinks a little and tilts left. Tablet/desktop only (≥ 768px).
     ===================================================================== */
  function initServiceStack(c) {
    q('.service-list', c).forEach(function (list) {
      var cards = q(':scope > .service-item-1', list);
      if (cards.length < 2) return;
      var mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', function () {
        list.classList.add('kl-stack');
        var bg = getComputedStyle(cards[0]).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = getComputedStyle(document.body).backgroundColor || '#ededed';
        cards.forEach(function (card, i) {
          gsap.set(card, { position: 'relative', zIndex: i + 1, backgroundColor: bg, transformOrigin: '50% 50%' });
        });
        var last = cards[cards.length - 1];
        cards.forEach(function (card, i) {
          if (card === last) return;
          var next = cards[i + 1];
          // tall cards pin by their bottom so nothing is cut off
          var tall = function () { return card.offsetHeight > window.innerHeight; };
          ST.create({
            trigger: card,
            start: function () { return tall() ? 'bottom bottom' : 'top top'; },
            endTrigger: last,
            end: function () { return tall() ? 'bottom bottom' : 'top top'; },
            pin: true,
            pinSpacing: false
          });
          gsap.to(card, {
            scale: 0.9, rotation: -3, ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true }
          });
          var shade = card.querySelector(':scope > .kl-stack-shade');
          if (!shade) {
            shade = document.createElement('span'); shade.className = 'kl-stack-shade';
            card.appendChild(shade);
          }
          gsap.fromTo(shade, { opacity: 0 }, {
            opacity: 0.35, ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true }
          });
        });
        return function () { list.classList.remove('kl-stack'); q('.kl-stack-shade', list).forEach(function (s) { s.remove(); }); };
      });
    });
  }

  /* =====================================================================
     MENU (tablet / phone) – panel wipes down, links rise in
     The site-wide KL menu script injects .kl-menu-btn and marks .kl-nav-item.
     ===================================================================== */
  function bindMenu() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      var btn = e.target.closest('.kl-menu-btn');
      if (btn) { e.stopImmediatePropagation(); e.preventDefault(); setMenu(!menu.open); return; }
      if (menu.open && e.target.closest('.kl-nav-item')) setMenu(false);
    }, true);
    window.addEventListener('resize', function () { if (menu.open && window.innerWidth > 991) closeMenu(true); });
  }
  function navParts() {
    var nav = document.querySelector('.navbar');
    return { nav: nav, btn: nav && nav.querySelector('.kl-menu-btn'), items: nav ? q('.kl-nav-item', nav) : [] };
  }
  function prepBtn(btn) {
    if (btn && !btn.querySelector('.kl-roll')) {
      btn.innerHTML = '<span class="kl-roll"><span class="kl-roll-a">Menu</span><span class="kl-roll-b" aria-hidden="true">Close</span></span>';
    }
  }
  function setMenu(v) {
    var p = navParts(); if (!p.nav || !p.btn || menu.busy) return;
    prepBtn(p.btn);
    menu.busy = true; menu.open = v;
    p.btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    gsap.to(q('.kl-roll-a, .kl-roll-b', p.btn), { yPercent: v ? -100 : 0, duration: 0.5, ease: E.menu });
    if (v) {
      p.nav.classList.add('kl-menu-open');
      lenis && lenis.stop();
      gsap.timeline({ onComplete: function () { menu.busy = false; } })
        .fromTo(backdrop, { clipPath: 'inset(0 0 100% 0)', autoAlpha: 1 }, { clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: E.menu }, 0)
        .fromTo(p.items, { yPercent: 102, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: D.text, ease: E.reveal, stagger: 0.0625 }, 0.15);
    } else {
      gsap.timeline({ onComplete: function () { p.nav.classList.remove('kl-menu-open'); gsap.set(p.items, { clearProps: 'all' }); lenis && lenis.start(); menu.busy = false; } })
        .to(p.items, { yPercent: 102, autoAlpha: 0, duration: 0.3, ease: E.exit, stagger: 0.035 }, 0)
        .to(backdrop, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: E.menu }, 0.1);
    }
  }
  function closeMenu(instant) {
    if (!menu.open) return;
    var p = navParts();
    menu.open = false; menu.busy = false;
    if (instant) {
      p.nav && p.nav.classList.remove('kl-menu-open');
      gsap.set(p.items, { clearProps: 'all' });
      gsap.set(backdrop, { autoAlpha: 0, clipPath: 'inset(0 0 100% 0)' });
      p.btn && gsap.set(q('.kl-roll-a, .kl-roll-b', p.btn), { yPercent: 0 });
      lenis && lenis.start();
    } else setMenu(false);
  }

  /* =====================================================================
     TESTIMONIAL SLIDER
     Markup: a div with [data-kl-track] whose direct children are the slides
     (Testimonial component instances). Arrows: .service-5-testimonials-button
     (1st = previous, 2nd = next). Dots are rebuilt from the slide count.
     Works without GSAP / with reduced motion (instant switch).
     ===================================================================== */
  function initSliders(c, gsap, Split) {
    q('[data-kl-track]', c).forEach(function (track) {
      var box = track.closest('.service-5-testimonials-wrapper') || track.parentElement;
      var slides = Array.prototype.slice.call(track.children);
      var n = slides.length;
      if (!n) return;
      track.style.display = 'grid';
      slides.forEach(function (s, i) {
        s.style.gridArea = '1 / 1';
        s.setAttribute('aria-hidden', i ? 'true' : 'false');
        s.style.opacity = i ? '0' : '';
        s.style.pointerEvents = i ? 'none' : '';
      });

      var dotsBox = box.querySelector('.service-5-testimonials-indicators');
      var dots = [];
      if (dotsBox) {
        var tpl = dotsBox.querySelector('.service-5-testimonials-indicators-item');
        if (tpl && n > 1) {
          dotsBox.innerHTML = '';
          slides.forEach(function (s, i) {
            var d = tpl.cloneNode(false);
            d.classList.toggle('filled', i === 0);
            d.style.cursor = 'pointer';
            d.addEventListener('click', function () { go(i); });
            dotsBox.appendChild(d);
            dots.push(d);
          });
        } else dotsBox.style.display = 'none';
      }

      var btns = q('.service-5-testimonials-button', box);
      if (n < 2) { btns.forEach(function (b) { b.style.display = 'none'; }); return; }
      btns.forEach(function (b, i) {
        var dir = i === 0 ? -1 : 1;
        b.setAttribute('role', 'button');
        b.setAttribute('tabindex', '0');
        b.setAttribute('aria-label', dir < 0 ? 'Vorherige Bewertung' : 'Nächste Bewertung');
        b.style.cursor = 'pointer';
        b.addEventListener('click', function (e) { e.preventDefault(); go(cur + dir, dir); });
        b.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(cur + dir, dir); }
        });
      });

      var cur = 0, busy = false, splits = [];
      function lines(i) {
        if (!Split) return [slides[i]];
        if (!splits[i]) {
          splits[i] = [];
          q('.text-block', slides[i]).forEach(function (el) {
            splits[i] = splits[i].concat(new Split(el, { type: 'lines', mask: 'lines', linesClass: 'kl-line' }).lines);
          });
          if (!splits[i].length) splits[i] = [slides[i]];
        }
        return splits[i];
      }
      if (gsap && Split && window.ScrollTrigger) {
        gsap.from(lines(0), {
          yPercent: 120, duration: D.text, ease: E.reveal, stagger: STAGGER,
          scrollTrigger: { trigger: track, start: 'top 88%', once: true }
        });
      }

      function go(to, dir) {
        to = (to + n) % n;
        if (busy || to === cur) return;
        dir = dir || (to > cur ? 1 : -1);
        var from = slides[cur], next = slides[to];
        dots.forEach(function (d, i) { d.classList.toggle('filled', i === to); });
        from.setAttribute('aria-hidden', 'true');
        next.setAttribute('aria-hidden', 'false');
        var prev = cur; cur = to;
        if (!gsap) {
          from.style.opacity = '0'; from.style.pointerEvents = 'none';
          next.style.opacity = ''; next.style.pointerEvents = '';
          return;
        }
        busy = true;
        gsap.timeline({ onComplete: function () { gsap.set(from, { opacity: 0, pointerEvents: 'none' }); busy = false; } })
          .to(lines(prev), { yPercent: -120 * dir, duration: 0.4, ease: E.exit, stagger: 0.02 }, 0)
          .set(next, { opacity: 1, pointerEvents: 'auto' }, 0.4)
          .fromTo(lines(to), { yPercent: 120 * dir }, { yPercent: 0, duration: D.text, ease: E.reveal, stagger: STAGGER }, 0.4);
      }
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
