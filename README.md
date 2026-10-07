# Gray Light Studio — Master Cinematic Website

A completely new static cinematic template built around the supplied Gray Light Studio photography, portraits, studio images and logo assets.

## Run locally

Because the site uses ES/browser animation libraries from CDNs, preview it through a local HTTP server rather than double-clicking the HTML file.

### VS Code
1. Open this folder in VS Code.
2. Install/use Live Server.
3. Open `index.html` with Live Server.

### Python
From this folder run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Main files

- `index.html` — semantic site markup and all site content.
- `css/site.css` — responsive design, perspective/depth system, mobile layout, reduced-motion and low-power fallback styles.
- `js/site.js` — modular loader/navigation/Lenis/GSAP/portfolio/lightbox/form interactions.
- `assets/original/` — supplied source assets preserved unchanged.
- `assets/optimized/` — web-sized WebP derivatives used by the site.

## Animation modules

The JavaScript is intentionally divided into functions:

- `initLoader()`
- `initNavigation()`
- `initLenis()`
- `initCursor()`
- `initMouseDepth()`
- `initHero()`
- `initAbout()`
- `initServices()`
- `initPortfolio()`
- `initFilm()`
- `initTeam()`
- `initProcess()`
- `initTestimonials()`
- `initContact()`
- `initPortfolioLightbox()`
- `initMagnetic()`

The full pinned cinematic timelines activate on capable desktop devices. Mobile, reduced-motion, data-saver/low-power devices, and browsers without GSAP fall back to a lighter intentionally designed layout.

## Performance choices

- No Three.js/WebGL dependency in the core experience.
- Motion uses transforms/opacity/clip-path rather than layout-heavy top/left/width/height animation.
- The supplied 4K–10K images are retained under `assets/original/`, but the page uses smaller WebP derivatives.
- Only the hero image is preloaded. Other imagery uses lazy loading.
- The custom cursor now renders on demand only while it is moving instead of keeping a permanent RAF loop alive; mouse-depth movement uses GSAP `quickTo`.
- Scroll work is delegated to GSAP ScrollTrigger/Lenis.
- Desktop pinned sequences are disabled on lower-power/reduced-motion configurations.

## Contact form

No server/API credentials were supplied. The form validates all required fields and then opens the visitor's email client with a pre-filled message to `hello@graylightstudio.in`.

For production, replace the `mailto:` fallback in `initContact()` with your preferred backend endpoint, WordPress/Gravity Forms integration, Formspree, or another form service.

## Accessibility

- Semantic sections and headings.
- Skip link.
- Keyboard focus states.
- Keyboard-operable project lightbox (Escape, Left Arrow, Right Arrow, Tab trapping).
- Accessible mobile navigation state.
- Descriptive image alternative text.
- `prefers-reduced-motion` support.
- Touch targets sized for mobile.

## External browser libraries

Loaded from jsDelivr:

- GSAP
- GSAP ScrollTrigger
- Lenis

If those external scripts are unavailable, the content still remains visible and navigable through the static/light fallback layout.

## Production refinement pass

This build includes an additional responsive/quality pass based on real viewport screenshots:

- hero typography is now constrained by viewport height as well as width, so it cannot rise into the fixed header on short laptop/tablet screens;
- the About composition gives text a dedicated readable zone while keeping the layered photography treatment;
- founder portraits use a stage height derived from portrait proportions, and mobile founders switch to normal document-flow cards so both names and role captions remain fully visible;
- the testimonial controller now explicitly clears GSAP inline visibility from inactive quotes, preventing multiple quotes from rendering on top of one another;
- testimonial typography is viewport-height aware to avoid clipping on short screens;
- intrinsic image width/height attributes were added to reduce layout shift while images decode;
- additional 1100px, 820px, 560px and short-viewport refinements protect spacing and eliminate horizontal overflow without removing the cinematic design.
