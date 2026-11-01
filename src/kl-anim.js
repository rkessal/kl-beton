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
     EASING – change these to restyle every animation (original set).
     ===================================================================== */
  var E = window.KL_EASE || {
    reveal:  'expo.out',      // text lines, rows, labels
    soft:    'expo.out',      // hero / about image zoom
    mask:    'power4.inOut',  // image + menu clip-path wipes
    menu:    'power4.inOut',  // mobile menu panel
    hover:   'power3.inOut',  // button roll, row fill out
    hoverIn: 'power3.out',    // row fill in, nudges
    nav:     'power3.out',    // navbar link roll (anuchome.com: ~1s power3.out)
    exit:    'power3.in',     // things leaving
    page:    'expo.out',      // new page revealed
    pageIn:  'power2.inOut'   // old page blurs, blue fades in
  };
  var D = window.KL_DUR || {
    text: 1.3, h1: 1.6, row: 1.1, img: 1.4, hero: 2.2, hover: 0.55, nav: 1,
    pageBlur: 0.7, pageIn: 0.6, pageHold: 0.15, pageOut: 1.1
  };
  /* Page transition: old page blurs a little, brand blue fades over it, new page un-blurs underneath */
  var PAGE = window.KL_PAGE || { color: '#105ba4', blur: 6 };
  var STAGGER = 0.06;
  var FADE = window.KL_FADE || { from: 0.5, start: 'top 85%', end: 'bottom 45%', scrub: 0.6 }; // scroll text fade
  var STACK = window.KL_STACK || { hold: '50vh', scale: 0.9, rotate: -3 }; // service cards
  var MARQUEE = window.KL_MARQUEE || { speed: 50, hoverSpeed: 0.3 }; // logo marquee: px per second, speed factor on hover
  var IMG_ZOOM = 1.1; // images start this much bigger and settle as their mask opens

  var root = document.documentElement;

  /* ---------- navbar: active link (.kl-current) ----------
     Candidates are the page links with a plain white background: the logo (first link) and the
     "Projekt anfragen" button are skipped. They get data-kl-nav-item so later checks don't depend
     on the (animated) background colour. */
  var normPath = function (p) { return (p || '/').replace(/\/+$/, '') || '/'; };
  function navItems(c) {
    return q('.navbar .nav-link', c || document).filter(function (a, i) {
      if (a.dataset.klNavItem) return true;
      if (i === 0 || !a.pathname || a.hostname !== location.hostname) return false;
      var bg = getComputedStyle(a).backgroundColor;
      if (/^rgba?\(255,\s*255,\s*255(,\s*1)?\)$/.test(bg) || a.classList.contains('kl-current')) { a.dataset.klNavItem = '1'; return true; }
      return false;
    });
  }
  // instant: used on page load / after a swap (the new navbar must look exactly like the old one did)
  function markCurrentNav(c) {
    var here = normPath(location.pathname);
    navItems(c).forEach(function (a) {
      a.classList.add('kl-nav-instant');
      a.classList.toggle('kl-current', normPath(a.pathname) === here);
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      q('.kl-nav-instant', c || document).forEach(function (a) { a.classList.remove('kl-nav-instant'); });
    }); });
  }
  // animated: on page-out the clicked destination becomes active (CSS transitions the colours)
  // and its blue hover copy rolls back down
  function navGoTo(path) {
    path = normPath(path);
    navItems(document).forEach(function (a) {
      var on = normPath(a.pathname) === path;
      a.classList.toggle('kl-current', on);
      if (on && window.gsap) {
        var parts = [a.querySelector(':scope > .kl-nav-a'), a.querySelector(':scope > .kl-nav-b')].filter(Boolean);
        if (parts.length) window.gsap.to(parts, { y: 0, duration: 0.6, ease: 'power3.out', overwrite: true });
      }
    });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function done() { root.classList.remove('kl-anim'); }

  /* ---------- no GSAP / reduced motion: content visible, slider + Barba-free ---------- */
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    done();
    var boot0 = function () { markCurrentNav(document); initSliders(document, reduce ? null : window.gsap, null); };
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
  var veil = { blur: 0, tint: 0 };
  function rgb(hex) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)].join(',');
  }
  function paintScreen() {
    var f = veil.blur > 0.01 ? 'blur(' + veil.blur.toFixed(2) + 'px)' : 'none';
    screen.style.backdropFilter = f; screen.style.webkitBackdropFilter = f;
    screen.style.backgroundColor = 'rgba(' + rgb(PAGE.color) + ',' + veil.tint.toFixed(3) + ')';
  }

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
          leave: function (data) {
            closeMenu(true);
            lenis && lenis.stop();
            root.classList.add('kl-leaving');
            navGoTo(data.next.url.path);
            // the screen blurs what's behind it (backdrop-filter), so fixed elements such as
            // the navbar stay where they are; a filter on the page itself would move them
            gsap.set(screen, { autoAlpha: 1 });
            return gsap.timeline()
              .fromTo(veil, { blur: 0 }, { blur: PAGE.blur, duration: D.pageBlur, ease: E.pageIn, onUpdate: paintScreen }, 0)
              .fromTo(veil, { tint: 0 }, { tint: 1, duration: D.pageIn, ease: E.pageIn, onUpdate: paintScreen }, D.pageBlur * 0.35)
              .to({}, { duration: D.pageHold });
          },
          afterLeave: function () { killPage(); },
          beforeEnter: function (data) {
            // the new page is already in the DOM here: drop the old one in the same frame,
            // so the navbar is never missing and the new page measures and initialises alone
            data.current.container && data.current.container.remove();
            window.scrollTo(0, 0);
            lenis && lenis.scrollTo(0, { immediate: true, force: true });
            resetWebflow(data.next.html);
            window.klMenuInit && window.klMenuInit();
            initPage(data.next.container);
          },
          enter: function () {
            lenis && lenis.start();
            return gsap.to(veil, {
              blur: 0, tint: 0, duration: D.pageOut, ease: E.page, onUpdate: paintScreen,
              onComplete: function () { gsap.set(screen, { autoAlpha: 0 }); }
            });
          },
          after: function () { root.classList.remove('kl-leaving'); ST.refresh(); }
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

  var pageCleanups = [];
  function killPage() {
    while (pageCleanups.length) { try { pageCleanups.pop()(); } catch (e) {} }
    if (ctx) { ctx.revert(); ctx = null; }
    ST.getAll().forEach(function (t) { t.kill(); });
  }

  /* =====================================================================
     EVERY PAGE
     ===================================================================== */
  function initPage(container) {
    killPage();
    markCurrentNav(container);
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
    '.hero-info, .service-5-item-list-item, [data-kl-track], .service-overview-text, [data-kl-fade], form, label';
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
        yPercent: 110, rotate: 0.001, duration: o.d || D.text, ease: E.reveal, stagger: o.stagger || STAGGER, delay: o.delay || 0,
        scrollTrigger: o.noST ? null : { trigger: el, start: 'top 88%', once: true }
      });
    }
    function fadeUp(el, o) {
      o = o || {};
      gsap.set(el, { visibility: 'visible' });
      gsap.from(el, {
        y: 24, autoAlpha: 0, duration: 0.9, ease: E.reveal, delay: o.delay || 0,
        scrollTrigger: o.noST ? null : { trigger: el, start: 'top 92%', once: true }
      });
    }

    /* ---------- text reveals ---------- */
    $('h1, h2, .text-block').forEach(function (el) {
      if (inside(el, SKIP) || el.closest('.footer')) { gsap.set(el, { visibility: 'visible' }); return; }
      var txt = (el.textContent || '').trim();
      if (!txt) { gsap.set(el, { visibility: 'visible' }); return; }
      if (/^\(.*\)$/.test(txt) || txt.length < 4) fadeUp(el); // small labels like (SERVICES)
      else splitReveal(el, el.tagName === 'H1' ? { d: D.h1, stagger: 0.1 } : {});
    });

    /* ---------- scroll-scrubbed text (bymonolog.com): no mask, letters go 0.5 → 1 opacity,
       reading through the paragraph line by line as it scrolls into view.
       Applies to .service-overview-text and anything with a data-kl-fade attribute. ---------- */
    $('.service-overview-text, [data-kl-fade]').forEach(function (box) {
      var targets = box.matches('[data-kl-fade]') && !box.matches('.service-overview-text') ? [box] : q('h1, h2, .text-block', box);
      if (!targets.length) targets = [box];
      targets.forEach(function (el) {
        gsap.set(el, { visibility: 'visible' });
        if (!Split) return;
        var s = new Split(el, { type: 'lines, words, chars', linesClass: 'kl-fade-line', wordsClass: 'kl-fade-word', charsClass: 'kl-fade-char' });
        gsap.fromTo(s.chars, { opacity: FADE.from }, {
          opacity: 1, ease: 'none', stagger: 0.04,
          scrollTrigger: { trigger: el, start: FADE.start, end: FADE.end, scrub: FADE.scrub }
        });
      });
    });

    /* ---------- image mask reveal + parallax ---------- */
    $(IMG_WRAPS).forEach(function (w) {
      if (w.tagName === 'IMG') w = w.parentElement;
      var img = w.querySelector('img'); if (!img) return;
      w.style.overflow = 'hidden';
      // mask opens while the image scales down 1.1 → 1 (on top of the parallax overscale)
      var BASE = 1.18; // room for the ±7% parallax below
      gsap.set(img, { scale: BASE * IMG_ZOOM, transformOrigin: '50% 50%' });
      gsap.timeline({ scrollTrigger: { trigger: w, start: 'top 90%', once: true } })
        .fromTo(w, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: D.img, ease: E.mask }, 0)
        .to(img, { scale: BASE, duration: D.img, ease: E.mask }, 0);
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
      gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.2, ease: E.reveal, delay: 0.6 });
      gsap.from(q('.hero-info', el), { y: 16, autoAlpha: 0, duration: 0.8, ease: E.reveal, stagger: 0.08, delay: 0.8 });
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

    /* ---------- navbar links: brand-blue copy rolls up from below on hover (anuchome.com) ----------
       Skips the logo (first link) and links with their own background (the "Projekt anfragen" button). */
    if (!isTouch) navItems(c).forEach(function (a) {
      if (a.dataset.klNav || !a.dataset.klNavItem) return; // candidates only (marked by navItems)
      a.dataset.klNav = '1';
      var top = document.createElement('span'); top.className = 'kl-nav-a';
      while (a.firstChild) top.appendChild(a.firstChild);
      var bottom = top.cloneNode(true); bottom.className = 'kl-nav-b'; bottom.setAttribute('aria-hidden', 'true');
      a.appendChild(top); a.appendChild(bottom);
      var h = function () { return -a.clientHeight; }; // padding box: .kl-nav-b sits at top:100% of it
      a.addEventListener('mouseenter', function () {
        if (a.classList.contains('kl-current') || root.classList.contains('kl-leaving')) return; // no hover on the active page
        gsap.to([top, bottom], { y: h, duration: D.nav, ease: E.nav, overwrite: true });
      });
      a.addEventListener('mouseleave', function () {
        if (root.classList.contains('kl-leaving')) return; // navGoTo is handling it
        gsap.to([top, bottom], { y: 0, duration: D.nav, ease: E.nav, overwrite: true });
      });
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
          if (fill) gsap.to(fill, { scaleY: 1, duration: D.hover, ease: E.hoverIn, overwrite: true });
          if (shift.length) gsap.to(shift, { x: o.dx || 14, duration: 0.6, ease: E.hoverIn, overwrite: true });
          if (o.dim) gsap.to(rows.filter(function (x) { return x !== r; }), { opacity: 0.35, duration: 0.4, overwrite: true });
          if (o.color) r.classList.add('kl-hover');
        });
        r.addEventListener('mouseleave', function () {
          if (fill) gsap.to(fill, { scaleY: 0, duration: D.hover, ease: E.hover, overwrite: true });
          if (shift.length) gsap.to(shift, { x: 0, duration: 0.6, ease: E.hoverIn, overwrite: true });
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
    // (.service-5-item-list-item is not here: it has its own clip-path wipe below, and a second
    //  tween with overwrite:true used to kill that wipe halfway and leave the borders cut short)
    ['.faq-list-item', '.service-4-article-list-item', '.footer-main-list-item',
     '.footer-main-right-links-item', '.about-compare-row', '.contact-details-item'].forEach(function (sel) {
      var rows = $(sel); if (!rows.length) return;
      gsap.set(rows, { y: 30, autoAlpha: 0 });
      ST.batch(rows, {
        start: 'top 94%', once: true,
        onEnter: function (b) { gsap.to(b, { y: 0, autoAlpha: 1, duration: D.row, ease: E.reveal, stagger: STAGGER, overwrite: 'auto' }); }
      });
    });

    /* project descriptions */
    $('.service-5-item-desc').forEach(function (d) {
      var items = q('.service-5-item-list-item', d);
      if (items.length) gsap.from(items, {
        clipPath: 'inset(0 100% 0 0)', duration: D.row, ease: E.reveal, stagger: 0.1,
        clearProps: 'clipPath', // never leave a partial clip behind
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
          gsap.from(s.lines, { yPercent: 110, rotate: 0.001, duration: D.h1, ease: E.reveal, delay: 0.15 + i * 0.1 });
        } else fadeUp(target, { noST: true, delay: i * 0.12 });
      });
      var bar = h.querySelector('.about-hero-bar');
      if (bar) gsap.from(bar, { scaleX: 0, transformOrigin: '0 50%', duration: D.img, ease: E.mask, delay: 0.5 });
      var img = h.querySelector('.about-hero-image');
      if (img) {
        gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: D.img, ease: E.mask, delay: 0.6 });
        var im = img.querySelector('img');
        if (im) gsap.fromTo(im, { scale: IMG_ZOOM }, { scale: 1, duration: D.img, ease: E.mask, delay: 0.6 });
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
            yPercent: 110, duration: 0.9, ease: E.reveal, stagger: 0.018, delay: i * 0.08,
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
    initMarquee(c);
    initSliders(c, gsap, Split);
  }

  /* =====================================================================
     LOGO MARQUEE – .service-logos scrolls endlessly with a soft fade on both edges.
     The cells keep their look (4 per row on desktop, 2 on tablet/phone); the set is
     repeated so the loop is seamless. Speed in px/s: MARQUEE.speed.
     ===================================================================== */
  function initMarquee(c) {
    q('.service-logos', c).forEach(function (row) {
      var track = row.querySelector(':scope > .kl-marquee-track');
      if (!track) {
        var cells = Array.prototype.slice.call(row.children);
        if (cells.length < 2) return;
        track = document.createElement('div'); track.className = 'kl-marquee-track';
        cells.forEach(function (cell) { track.appendChild(cell); });
        row.appendChild(track);
        row.classList.add('kl-marquee');
        track.dataset.count = cells.length;
      }
      var count = +track.dataset.count;
      var originals = Array.prototype.slice.call(track.children, 0, count);
      var tween = null;
      function build() {
        if (tween) tween.kill();
        var perView = window.innerWidth <= 991 ? 2 : 4;
        var cellW = Math.round(row.clientWidth / perView); // whole pixels: 1px borders stay crisp
        // enough copies to always cover the row twice
        var sets = Math.max(2, Math.ceil((row.clientWidth * 2) / (cellW * count)));
        while (track.children.length > count) track.removeChild(track.lastChild);
        for (var k = 1; k < sets; k++) originals.forEach(function (o) {
          var cl = o.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); track.appendChild(cl);
        });
        Array.prototype.forEach.call(track.children, function (cell) { cell.style.width = cellW + 'px'; cell.style.flex = '0 0 ' + cellW + 'px'; });
        var setW = cellW * count;
        gsap.set(track, { x: 0 });
        tween = gsap.to(track, {
          x: -setW, duration: setW / MARQUEE.speed, ease: 'none', repeat: -1,
          modifiers: { x: function (v) { return Math.round(parseFloat(v)) + 'px'; } } // no half-pixel borders while moving
        });
        if (!isTouch) {
          row.onmouseenter = function () { gsap.to(tween, { timeScale: MARQUEE.hoverSpeed, duration: 0.6, overwrite: true }); };
          row.onmouseleave = function () { gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }); };
        }
      }
      build();
      var w = window.innerWidth, t;
      var onResize = function () { if (window.innerWidth === w) return; w = window.innerWidth; clearTimeout(t); t = setTimeout(build, 150); };
      window.addEventListener('resize', onResize);
      pageCleanups.push(function () { window.removeEventListener('resize', onResize); if (tween) tween.kill(); });
    });
  }

  /* =====================================================================
     SERVICE LIST – stacked cards
     Each card is at least one screen tall and full width (the list's side
     padding moves inside the cards, see .kl-stack in site-head.html). It pins
     while the next one slides up over it, shrinking a little and tilting left;
     the dark list background only shows around a shrinking card.
     Tablet/desktop only (≥ 768px).
     ===================================================================== */
  function initServiceStack(c) {
    q('.service-list', c).forEach(function (list) {
      var cards = q(':scope > .service-item-1', list);
      if (cards.length < 2) return;
      var mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', function () {
        // cards take the list's own background (read before .kl-stack turns the list dark)
        var clear = function (c) { return !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c); };
        var bg = getComputedStyle(cards[0]).backgroundColor;
        if (clear(bg)) bg = getComputedStyle(list).backgroundColor;
        if (clear(bg)) bg = getComputedStyle(document.body).backgroundColor;
        if (clear(bg)) bg = '#ffffff';
        list.classList.add('kl-stack');
        cards.forEach(function (card, i) {
          gsap.set(card, { position: 'relative', zIndex: i + 1, backgroundColor: bg, transformOrigin: '50% 50%' });
          // hold: each card stays pinned this much longer before the next one starts sliding over it
          if (i > 0) gsap.set(card, { marginTop: STACK.hold });
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
            scale: STACK.scale, rotation: STACK.rotate, ease: 'none',
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
    gsap.to(q('.kl-roll-a, .kl-roll-b', p.btn), { yPercent: v ? -100 : 0, duration: 0.5, ease: E.hover });
    if (v) {
      p.nav.classList.add('kl-menu-open');
      lenis && lenis.stop();
      gsap.timeline({ onComplete: function () { menu.busy = false; } })
        .fromTo(backdrop, { clipPath: 'inset(0 0 100% 0)', autoAlpha: 1 }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: E.menu }, 0)
        .fromTo(p.items, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: E.reveal, stagger: 0.06 }, 0.35);
    } else {
      gsap.timeline({ onComplete: function () { p.nav.classList.remove('kl-menu-open'); gsap.set(p.items, { clearProps: 'all' }); lenis && lenis.start(); menu.busy = false; } })
        .to(p.items, { yPercent: -40, autoAlpha: 0, duration: 0.4, ease: E.exit, stagger: 0.04 }, 0)
        .to(backdrop, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: E.menu }, 0.15);
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
          yPercent: 110, duration: D.text, ease: E.reveal, stagger: STAGGER,
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
          .to(lines(prev), { yPercent: -110 * dir, duration: 0.4, ease: E.exit, stagger: 0.02 }, 0)
          .set(next, { opacity: 1, pointerEvents: 'auto' }, 0.4)
          .fromTo(lines(to), { yPercent: 110 * dir }, { yPercent: 0, duration: D.text, ease: E.reveal, stagger: STAGGER }, 0.4);
      }
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
