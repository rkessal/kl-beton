# Webflow custom code backup – 4 Nov 2026

Everything custom on kl-beton.webflow.io, taken from the live site right before the transfer to the client.

| File | Where it goes in Webflow |
|---|---|
| `site-head.html` | Site settings → Custom code → **Head code** |
| `site-footer.html` | Site settings → Custom code → **Footer code** |
| `embeds/testimonial-arrow-button-icon.html` | Code Embed inside the **button-icon** component (testimonial arrows) |
| `embeds/contact-submit-icon.html` | Code Embed inside **.contact-submit-icon** on the Kontakt page (form button) |

Also checked, nothing to back up:
- Page settings custom code (head + footer) on all 5 pages: empty
- Registered scripts / apps: none

The animation script itself is not in Webflow: the footer loads it from GitHub via jsDelivr
(`rkessal/kl-beton@latest`). Source: `src/kl-anim.js`, build: `dist/kl-anim.min.js` in this repo.

## Restore
1. Paste `site-head.html` into Head code and `site-footer.html` into Footer code (replace what's there).
2. Check the two Code Embeds above still exist; paste the SVGs back if they're empty.
3. Publish. On a Starter (free) site plan custom code can't be edited or doesn't run: the site needs a paid Site plan.
