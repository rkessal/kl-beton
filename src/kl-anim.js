/* KL Beton – GSAP animations  */
(function () {
  /* ===== EASING – change these to restyle every animation ===== */
  /* Motion language from rkessal/portfolio-v5:
     expo.out for reveals + hovers, power2.inOut for clip/mask wipes,
     power2.in for exits, Lenis lerp 0.1 */
  var E = window.KL_EASE || {
    reveal: 'expo.out',     // text lines, rows, labels (v5: 1.5s, stagger .05)
    soft:   'expo.out',     // hero image zoom, about image (v5: 2s)
    mask:   'power2.inOut', // image / menu clip-path wipes
    hover:  'expo.out',     // button roll, row fill out
    hoverIn:'expo.out',     // row fill in, nudges
    exit:   'power2.in'     // menu items leaving (v5: 0.3s)
  };
  var EASE = E.reveal, ease2 = E.soft;

  /* ---------- Testimonial slider ----------
     Markup: a div with [data-kl-track] whose direct children are the slides
     (Testimonial component instances). Arrows: .service-5-testimonials-button
     (1st = previous, 2nd = next). Dots are rebuilt from the slide count.
     Runs even without GSAP / with reduced motion (instant switch). */
  function initSliders(gsap, Split) {
    var q = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    q('[data-kl-track]').forEach(function (track) {
      var box = track.closest('.service-5-testimonials-wrapper') || track.parentElement;
      var slides = Array.prototype.slice.call(track.children);
      var n = slides.length;
      if (!n) return;
      track.style.display = 'grid';
      slides.forEach(function (s, i) {
        s.style.gridArea = '1 / 1';
        s.setAttribute('aria-hidden', i ? 'true' : 'false');
        if (i) { s.style.opacity = '0'; s.style.pointerEvents = 'none'; }
      });

      // dots
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

      // arrows
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
      // first slide: reveal its lines when the section scrolls in
      if (gsap && Split && window.ScrollTrigger) {
        gsap.from(lines(0), { yPercent: 100, duration: 1.5, ease: E.reveal, stagger: 0.05,
          scrollTrigger: { trigger: track, start: 'top 88%', once: true } });
      }
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
          .to(lines(prev), { yPercent: -100 * dir, duration: 0.4, ease: E.exit, stagger: 0.02 }, 0)
          .set(next, { opacity: 1, pointerEvents: 'auto' }, 0.4)
          .fromTo(lines(to), { yPercent: 100 * dir }, { yPercent: 0, duration: 1.2, ease: E.reveal, stagger: 0.05 }, 0.4);
      }
    });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  function done() { root.classList.remove('kl-anim'); }
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    done();
    initSliders(reduce ? null : window.gsap, null);
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  gsap.registerPlugin(ST);
  if (Split) gsap.registerPlugin(Split);
  var $ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, anchors: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.klLenis = lenis;
  }

  /* ---------- helpers ---------- */
  function inside(el, sel) { return !!el.closest(sel); }
  var SKIP = '.navbar, .button, .button-2, .contact-submit, .faq-list-item, .footer-main-list-item, .footer-main-right-links-item, .service-4-article-list-item, .about-quality-line, .about-hero-word, .hero-info, .service-5-item-list-item, [data-kl-track], form, label';

  function splitReveal(el, opts) {
    opts = opts || {};
    if (!Split) { fadeUp(el, opts); return; }
    var s = new Split(el, { type: 'lines', mask: 'lines', linesClass: 'kl-line' });
    gsap.set(el, { visibility: 'visible' });
    gsap.from(s.lines, {
      yPercent: 100, duration: opts.d || 1.5, ease: EASE, stagger: opts.stagger || 0.05, delay: opts.delay || 0,
      scrollTrigger: opts.noST ? null : { trigger: el, start: 'top 88%', once: true }
    });
  }
  function fadeUp(el, opts) {
    opts = opts || {};
    gsap.set(el, { visibility: 'visible' });
    gsap.from(el, {
      y: 24, autoAlpha: 0, duration: 0.9, ease: EASE, delay: opts.delay || 0,
      scrollTrigger: opts.noST ? null : { trigger: el, start: 'top 92%', once: true }
    });
  }

  /* ---------- text reveals ---------- */
  document.fonts && document.fonts.ready ? document.fonts.ready.then(initText) : initText();
  function initText() {
    $('h1, h2, .text-block').forEach(function (el) {
      if (inside(el, SKIP) || el.closest('.footer')) { gsap.set(el, { visibility: 'visible' }); return; }
      var txt = (el.textContent || '').trim();
      if (!txt) return;
      if (/^\(.*\)$/.test(txt) || txt.length < 4) fadeUp(el); // small labels like (SERVICES)
      else splitReveal(el, { stagger: el.tagName === 'H1' ? 0.08 : 0.05, d: el.tagName === 'H1' ? 1.6 : 1.5 });
    });
    $('.footer h1, .footer h2, .footer .text-block').forEach(function (el) { gsap.set(el, { visibility: 'visible' }); });
    ST.refresh();
  }

  /* ---------- image mask reveal + parallax ---------- */
  var IMG_WRAPS = '.service-hero-image, .service-item-image, .service-3-img, .service-5-item-image-wrapper, .cta-item-image-wrapper, .about-onsite-image, .contact-image, .service-5-item-image-wrapper';
  $(IMG_WRAPS).forEach(function (w) {
    if (w.tagName === 'IMG') w = w.parentElement;
    if (w.dataset.klImg) return; w.dataset.klImg = '1';
    var img = w.querySelector('img'); if (!img) return;
    w.style.overflow = 'hidden';
    gsap.fromTo(w, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: E.mask,
      scrollTrigger: { trigger: w, start: 'top 90%', once: true }
    });
    gsap.set(img, { scale: 1.18, transformOrigin: '50% 50%' });
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* Home hero background: slow zoom-out on load + parallax */
  $('.hero-image img').forEach(function (img) {
    gsap.fromTo(img, { scale: 1.25 }, { scale: 1.08, duration: 2, ease: ease2 });
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  $('.hero-aside').forEach(function (el) {
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.2, ease: EASE, delay: 0.6 });
    gsap.from($('.hero-info', el), { y: 16, autoAlpha: 0, duration: 0.8, ease: EASE, stagger: 0.08, delay: 0.8 });
  });

  /* ---------- buttons: text roll + arrow swap (Monolog style) ---------- */
  $('.button, .button-2, .contact-submit').forEach(function (b) {
    var t = b.querySelector('.button-text, .button-text-light, .contact-submit-button');
    var icon = b.querySelector('.btn-icon, .contact-submit-icon svg, .contact-submit-icon img, img');
    if (t && t.tagName !== 'INPUT' && !t.dataset.klRoll) {
      t.dataset.klRoll = '1';
      var label = t.textContent;
      t.innerHTML = '';
      t.classList.add('kl-roll');
      var a = document.createElement('span'), c = document.createElement('span');
      a.className = 'kl-roll-a'; c.className = 'kl-roll-b';
      a.textContent = c.textContent = label;
      c.setAttribute('aria-hidden', 'true');
      t.appendChild(a); t.appendChild(c);
    }
    var iconWrap = null, icon2 = null;
    if (icon && icon.parentElement) {
      iconWrap = document.createElement('span'); iconWrap.className = 'kl-icon';
      icon.parentElement.insertBefore(iconWrap, icon);
      iconWrap.appendChild(icon);
      icon2 = icon.cloneNode(true); icon2.classList.add('kl-icon-2'); icon2.setAttribute('aria-hidden', 'true');
      iconWrap.appendChild(icon2);
    }
    if (isTouch) return;
    var tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: E.hover } });
    var rolls = $('.kl-roll-a, .kl-roll-b', b);
    if (rolls.length) tl.to(rolls, { yPercent: -100 }, 0);
    if (icon2) tl.fromTo(icon, { x: 0, y: 0 }, { x: '120%', y: '-120%' }, 0)
                 .fromTo(icon2, { x: '-120%', y: '120%' }, { x: 0, y: 0 }, 0);
    b.addEventListener('mouseenter', function () { tl.play(); });
    b.addEventListener('mouseleave', function () { tl.reverse(); });
  });

  /* ---------- row hovers (FAQ, footer, process list) ---------- */
  function addFill(el, cls) {
    if (el.querySelector(':scope > .kl-fill')) return el.querySelector(':scope > .kl-fill');
    var f = document.createElement('span'); f.className = 'kl-fill ' + (cls || '');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.insertBefore(f, el.firstChild);
    return f;
  }
  function rowGroup(sel, opts) {
    var rows = $(sel); if (!rows.length || isTouch) return;
    rows.forEach(function (r) {
      var fill = opts.fill ? addFill(r, opts.fill) : null;
      var shift = opts.shift ? $(opts.shift, r) : [];
      r.addEventListener('mouseenter', function () {
        if (fill) gsap.to(fill, { scaleY: 1, duration: 0.55, ease: E.hoverIn, overwrite: true });
        if (shift.length) gsap.to(shift, { x: opts.dx || 14, duration: 0.6, ease: E.hoverIn, overwrite: true });
        if (opts.dim) gsap.to(rows.filter(function (o) { return o !== r; }), { opacity: 0.35, duration: 0.4, overwrite: true });
        if (opts.color) r.classList.add('kl-hover');
      });
      r.addEventListener('mouseleave', function () {
        if (fill) gsap.to(fill, { scaleY: 0, duration: 0.5, ease: E.hover, overwrite: true });
        if (shift.length) gsap.to(shift, { x: 0, duration: 0.6, ease: E.hoverIn, overwrite: true });
        if (opts.dim) gsap.to(rows, { opacity: 1, duration: 0.4, overwrite: true });
        if (opts.color) r.classList.remove('kl-hover');
      });
    });
  }
  rowGroup('.faq-list-item', { dim: true, shift: '.faq-list-title', dx: 16 });
  rowGroup('.service-4-article-list-item', { fill: 'kl-fill-brand', color: true });
  rowGroup('.footer-main-list-item', { fill: 'kl-fill-dark', color: true, shift: '.text-block', dx: 12 });
  rowGroup('.footer-main-right-links-item', { shift: '.text-block', dx: 10 });

  /* FAQ rows / list rows appear */
  ['.faq-list-item', '.service-4-article-list-item', '.service-5-item-list-item', '.footer-main-list-item', '.footer-main-right-links-item', '.about-compare-row', '.contact-details-item'].forEach(function (sel) {
    var rows = $(sel); if (!rows.length) return;
    gsap.set(rows, { y: 30, autoAlpha: 0 });
    ST.batch(rows, {
      start: 'top 94%', once: true,
      onEnter: function (b) { gsap.to(b, { y: 0, autoAlpha: 1, duration: 1.5, ease: EASE, stagger: 0.05, overwrite: true }); }
    });
  });

  /* ---------- project descriptions (OH style) ---------- */
  $('.service-5-item-desc').forEach(function (d) {
    var items = $('.service-5-item-list-item', d);
    if (items.length) gsap.from(items, {
      clipPath: 'inset(0 100% 0 0)', duration: 1, ease: E.soft, stagger: 0.1,
      scrollTrigger: { trigger: d, start: 'top 85%', once: true }
    });
  });

  /* ---------- About hero ---------- */
  $('.about-hero').forEach(function (h) {
    var words = $('.about-hero-word', h);
    words.forEach(function (w, i) {
      var target = w.querySelector('h1, h2, .text-block') || w;
      if (Split) {
        var s = new Split(target, { type: 'lines', mask: 'lines' });
        gsap.set(target, { visibility: 'visible' });
        gsap.from(s.lines, { yPercent: 100, duration: 1.5, ease: EASE, delay: 0.15 + i * 0.1 });
      } else fadeUp(target, { noST: true, delay: i * 0.12 });
    });
    var bar = h.querySelector('.about-hero-bar');
    if (bar) gsap.from(bar, { scaleX: 0, transformOrigin: '0 50%', duration: 1.2, ease: E.mask, delay: 0.5 });
    var img = h.querySelector('.about-hero-image');
    if (img) {
      gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: E.mask, delay: 0.6 });
      var im = img.querySelector('img');
      if (im) gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: 2, ease: ease2, delay: 0.6 });
    }
  });

  /* ---------- About "Woran man gute Arbeit später erkennt" (Monolog style) ---------- */
  $('.about-quality').forEach(function (q) {
    var lines = $('.about-quality-line', q);
    lines.forEach(function (l, i) {
      var t = l.querySelector('h1, h2, .text-block') || l;
      gsap.set(t, { visibility: 'visible' });
      gsap.fromTo(l, { xPercent: i % 2 ? 18 : -18 }, {
        xPercent: 0, ease: 'none',
        scrollTrigger: { trigger: q, start: 'top 85%', end: 'top 15%', scrub: 1 }
      });
      if (Split) {
        var s = new Split(t, { type: 'chars', mask: 'chars' });
        gsap.from(s.chars, {
          yPercent: 100, duration: 1.5, ease: EASE, stagger: 0.02, delay: i * 0.08,
          scrollTrigger: { trigger: q, start: 'top 75%', once: true }
        });
      }
    });
    var logo = q.querySelector('.about-quality-logo');
    if (logo) gsap.from(logo, { y: 30, autoAlpha: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: logo, start: 'top 95%', once: true } });
  });

  /* ---------- Service item numbers / dots ---------- */
  $('.service-dot, .contact-label-dot, .contact-details-dot, .footer-main-list-item-dot, .nav-link-dot').forEach(function (d) {
    if (inside(d, '.navbar')) return;
    gsap.from(d, { scale: 0, duration: 0.6, ease: 'back.out(3)', scrollTrigger: { trigger: d, start: 'top 95%', once: true } });
  });

  /* ---------- Mobile menu (Anuc Home style) ---------- */
  var nav = document.querySelector('.navbar');
  if (nav) initMenu();
  function initMenu() {
    var btn = nav.querySelector('.kl-menu-btn');
    if (!btn) { setTimeout(initMenu, 100); return; }
    var items = $('.kl-nav-item', nav);
    var open = false, busy = false;
    btn.innerHTML = '<span class="kl-roll"><span class="kl-roll-a">Menu</span><span class="kl-roll-b" aria-hidden="true">Close</span></span>';
    var backdrop = document.createElement('div'); backdrop.className = 'kl-menu-backdrop';
    document.body.appendChild(backdrop);
    function setOpen(v) {
      if (busy) return; busy = true; open = v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      gsap.to($('.kl-roll-a, .kl-roll-b', btn), { yPercent: v ? -100 : 0, duration: 0.5, ease: E.hover });
      if (v) {
        nav.classList.add('kl-menu-open');
        lenis && lenis.stop();
        gsap.timeline({ onComplete: function () { busy = false; } })
          .fromTo(backdrop, { clipPath: 'inset(0 0 100% 0)', autoAlpha: 1 }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: E.mask }, 0)
          .fromTo(items, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: EASE, stagger: 0.06 }, 0.15);
      } else {
        gsap.timeline({ onComplete: function () { nav.classList.remove('kl-menu-open'); gsap.set(items, { clearProps: 'all' }); lenis && lenis.start(); busy = false; } })
          .to(items, { yPercent: 100, autoAlpha: 0, duration: 0.3, ease: E.exit, stagger: 0.03 }, 0)
          .to(backdrop, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: E.mask }, 0.15);
      }
    }
    // take over the site-wide toggle on these pages
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.kl-menu-btn')) {
        e.stopImmediatePropagation(); e.preventDefault(); setOpen(!open);
      } else if (open && e.target.closest && e.target.closest('.kl-nav-item')) {
        setOpen(false);
      }
    }, true);
    window.addEventListener('resize', function () { if (open && window.innerWidth > 991) { busy = false; setOpen(false); } });
  }

  /* ---------- reveal everything still hidden; refresh ---------- */
  window.addEventListener('load', function () { ST.refresh(); });
  initSliders(gsap, Split);
  window.klAnimReady = true;
})();
