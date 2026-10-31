# KL Beton – animations

GSAP, SplitText, ScrollTrigger and Lenis animations for the KL Beton Webflow site (kl-beton.webflow.io).

## Files

- `src/kl-anim.js` – readable source. Edit this one.
- `dist/kl-anim.min.js` – minified build that Webflow loads through jsDelivr.
- `webflow/head.html` – goes in each page's **Inside `<head>` tag** code. It hides headings until they're split, with a 3 s failsafe, and holds the CSS for the rolls, fills and menu backdrop.
- `webflow/footer.html` – goes in each page's **Before `</body>` tag** code. It loads the CDN libraries and this script.
- `test/` – a Playwright mock page that checks the script runs without errors.

## Easing

All eases are set in the `E` object at the top of `src/kl-anim.js`, following the motion language from portfolio-v5:

| key       | ease           | used for                         |
|-----------|----------------|----------------------------------|
| reveal    | `expo.out`     | text lines and rows (1.5 s, 0.05 stagger) |
| soft      | `expo.out`     | hero and about image zoom (2 s)  |
| mask      | `power2.inOut` | clip-path wipes on images and the menu |
| hover     | `expo.out`     | button roll, row fill out        |
| hoverIn   | `expo.out`     | row fill in, nudges              |
| exit      | `power2.in`    | menu items leaving (0.3 s)       |

To try different eases without rebuilding, set `window.KL_EASE = {...}` in a script that runs before this one.

## Updating the live site

```bash
npm install
# edit src/kl-anim.js
npm test                   # builds dist/ and runs the mock check
git commit -am "..." && git tag v1.0.1 && git push --follow-tags
```

Then change the version in the Webflow footer script tag (`@v1.0.0` → `@v1.0.1`) and publish.
Pinning a tag avoids jsDelivr's 12-hour cache on `@main`. To test quickly before tagging, use a commit hash: `@<sha>`.

## Testimonial slider (home page)

The "Bewertungen" section is a slider driven by `initSliders()` in `src/kl-anim.js`.

- **Add a testimonial:** in the Webflow Navigator, open *Testimonials Track*, select a **Testimonial** instance, duplicate it (Cmd+D) and edit its **Author** and **Quote** props in the right panel.
- **Remove one:** delete the instance. The dots are rebuilt from the slide count, and with a single testimonial the arrows and dots are hidden.
- **Arrows:** the first `.service-5-testimonials-button` goes back, the second goes forward. Both wrap around and work from the keyboard (Enter or Space).
- The slider still works with reduced motion; it then switches instantly.
