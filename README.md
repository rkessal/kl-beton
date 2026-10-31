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

All eases and durations are at the top of `src/kl-anim.js` (the original set):

| key      | ease           | used for                                   |
|----------|----------------|--------------------------------------------|
| reveal   | `expo.out`     | text lines (1.3 s, H1 1.6 s, from 110%), rows (1.1 s) |
| soft     | `expo.out`     | hero zoom (2.2 s), about image             |
| mask     | `power4.inOut` | image clip-path wipes (1.4 s); the image scales 1.1 → 1 at the same time (`IMG_ZOOM`) |
| menu     | `power4.inOut` | mobile menu panel                          |
| hover    | `power3.inOut` | button roll, row fill out                  |
| hoverIn  | `power3.out`   | row fill in, nudges                        |
| nav      | `power3.out`   | navbar link roll (1 s, measured on anuchome.com) |
| exit     | `power3.in`    | things leaving                             |
| page / pageIn | `expo.out` / `power2.inOut` | page transition          |

To try other values without rebuilding, set `window.KL_EASE` / `window.KL_DUR` before the script loads, or just edit them with `npm run dev` running.

## Navbar

- **Hover (anuchome.com):** each link has a brand-blue copy (white text, white dot) below it that rolls up over 1 s with `power3.out`, and back down on leave. The logo and the "Projekt anfragen" button are left alone.
- **Active page:** the current page's link gets `--_colors---f3f3f2` and a brand-blue dot (`.kl-current`). The active link has no hover roll.
- **On click (page-out):** the destination link becomes active right away. Its blue copy rolls back down, its background fades to grey (0.6 s), and the old active link fades back to white. The new page's navbar is marked instantly, so the swap is seamless.

## Scroll text fade (bymonolog.com)

`.service-overview-text`, and any element you give a `data-kl-fade` attribute in Webflow, is split into letters with no mask. Each letter goes from 0.5 to 1 opacity while you scroll, so the paragraph fills in line by line, from when its top reaches 85% of the screen until its bottom reaches 45%. The values are in `FADE` at the top of `src/kl-anim.js`.

## Logo marquee

`.service-logos` (the client logos on the service pages) scrolls endlessly to the left at 50 px/s and slows down on hover. It shows 4 cells at a time on desktop and 2 on tablet and phone, and both edges fade out (8% gradient mask). The cells are repeated in JS for a seamless loop, so add or remove logos in Webflow as usual. Settings: `MARQUEE` at the top of `src/kl-anim.js`.

## Service list – stacked cards

On the service pages (≥ 768 px), each `.service-list > .service-item-1` pins, holds for half a screen of scrolling (`STACK.hold`, `50vh`), then the next card slides up over it. The pinned card scales to 0.9, tilts −3° and darkens slightly, with the section background showing through as `#1e1e1e`. Cards taller than the screen pin by their bottom edge so nothing is cut off. Below 768 px the list scrolls normally.

## Testimonial slider (home page)

- **Add a testimonial:** in the Navigator, open *Testimonials Track*, duplicate a **Testimonial** instance (Cmd+D) and edit its **Author** and **Quote** props.
- **Remove one:** delete the instance. The dots follow the slide count, and with a single testimonial the arrows and dots are hidden.
- **Arrows:** the first `.service-5-testimonials-button` goes back, the second goes forward. Both wrap around and work from the keyboard.

## Live preview from your machine

```bash
brew install cloudflared     # once
npm run dev
```

This serves `src/kl-anim.js` (unminified, no build needed) on `localhost:5173`, opens a Cloudflare quick tunnel and prints a link like:

    https://kl-beton.webflow.io/?kl-dev=https://xxxx.trycloudflare.com

Open it and the staging site runs **your local code**. The page reloads every time you save a file in `src/`, and a blue **DEV** badge shows bottom-left.

- The browser remembers the setting. Click the badge or add `?kl-dev=off` to go back to the published build.
- Only `*.webflow.io` honours `?kl-dev`; the custom domain always loads the published build. Only `trycloudflare.com` and `localhost` URLs are accepted.
- If the tunnel is down, the page falls back to the published build and the badge turns red.
- The tunnel URL changes each time you run `npm run dev`; just open the new link it prints. No Webflow publish is needed.

When you're happy with it, release it as described in the next section.

## Updating the live site

```bash
npm install
# edit src/kl-anim.js
npm test                    # builds dist/ and runs all mock checks
git commit -am "..." && git tag v1.1.1 && git push --follow-tags
```

Then in Webflow, open **Site settings → Custom code → Footer**, change `PROD = '...@v1.1.0/...'` in the KL loader to the new tag (`@v1.1.1`) and publish.
