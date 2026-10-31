# KL Beton – animations

GSAP, SplitText, ScrollTrigger, Lenis and Barba for the KL Beton Webflow site (kl-beton.webflow.io).

## Files

- `src/kl-anim.js` – readable source. Edit this one.
- `dist/kl-anim.min.js` – minified build that Webflow loads through jsDelivr.
- `webflow/site-head.html` – **Site settings → Custom code → Head code**. It hides headings until they're split (3 s failsafe) and holds the CSS for the rolls, fills, menu backdrop, page transition screen and stacked cards.
- `webflow/site-footer.html` – **Site settings → Custom code → Footer code**: the responsive menu, the CDN libraries and this script.
- `test/` – Playwright mocks: `run.js` and `slider.js` for single pages, `barba.js` for a two-page site covering page transitions, re-init and the card stack.

Pages have no page-level custom code any more. Everything is site-wide so Barba can re-initialise each page.

## Page transitions (Barba)

These attributes are set in Webflow on every page:

```
<body data-barba="wrapper">
  <main data-barba="container" data-barba-namespace="home|about|contact|service">
```

**When you add a new page, give its Body and Main elements the same attributes**, or links to it will do a normal full page load.

The transition copies oharchitecture.com.au:
1. A dark screen fades in (0.35 s).
2. It holds for 0.375 s while the old page is removed.
3. The new page is initialised underneath.
4. The screen fades out (0.875 s) and the text rises in.

Same-page anchors (`#faq`), links to other sites, `mailto:`/`tel:` and anything with `data-barba-prevent` skip the transition. Webflow interactions are re-initialised after each swap.

Lifecycle in `kl-anim.js`: `boot()` runs once; `initPage(container)` runs per page inside a `gsap.context`; `killPage()` reverts it (tweens, ScrollTriggers, SplitText).

## Easing

All eases and durations are at the top of `src/kl-anim.js`. The curves come from oharchitecture.com.au:

| key      | curve                    | used for                          |
|----------|--------------------------|-----------------------------------|
| reveal   | `0.16, 1, 0.35, 1`       | text lines (1 s, 0.0825 stagger, from 120%), rows |
| soft     | `0.16, 1, 0.35, 1`       | hero / about image zoom (1.8 s)   |
| mask     | `0.76, 0, 0.24, 1`       | image clip-path wipes (1.2 s)     |
| menu     | `.7, 0, .22, 1`          | menu panel (0.5 s)                |
| hover    | `0.16, 1, 0.35, 1`       | buttons, row fills (0.6 s)        |
| exit     | `power1.in`              | things leaving                    |
| page     | `0.16, 1, 0.35, 1`       | transition screen                 |

To try other values without rebuilding, set `window.KL_EASE` / `window.KL_DUR` before the script loads.

## Service list – stacked cards

On the service pages (≥ 768 px), each `.service-list > .service-item-1` pins while the next card slides up over it. The pinned card scales to 0.9, tilts −3° and darkens slightly, with the section background showing through as `#1e1e1e`. Cards taller than the screen pin by their bottom edge so nothing is cut off. Below 768 px the list scrolls normally.

## Testimonial slider (home page)

- **Add a testimonial:** in the Navigator, open *Testimonials Track*, duplicate a **Testimonial** instance (Cmd+D) and edit its **Author** and **Quote** props.
- **Remove one:** delete the instance. The dots follow the slide count, and with a single testimonial the arrows and dots are hidden.
- **Arrows:** the first `.service-5-testimonials-button` goes back, the second goes forward. Both wrap around and work from the keyboard.

## Updating the live site

```bash
npm install
# edit src/kl-anim.js
npm test                    # builds dist/ and runs all mock checks
git commit -am "..." && git tag v1.1.1 && git push --follow-tags
```

Then bump the version in the last script tag of the **site footer code** (`@v1.1.0` → `@v1.1.1`) and publish.
