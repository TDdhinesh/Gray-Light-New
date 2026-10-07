# Gray Light Studio — Refinement QA Report

## Issues corrected

- Header/hero collision on narrow and wide-short viewports.
- Hero typography overflowing upward into the navigation area.
- About copy colliding with layered studio photography.
- Founder portraits/captions being cut by a viewport-height-based stage.
- Testimonial quotes stacking on top of one another after GSAP state changes.
- Testimonial heading losing its top spacing when the inner wrapper was pinned.
- Mobile founder layout relying on absolute positioning.
- Avoidable layout shift from images without intrinsic dimensions.
- Permanent custom-cursor animation-frame loop.

## Responsive layout checks

Static layout/overflow checks were run at:

- 1920 × 1080
- 1600 × 900
- 1366 × 768
- 1280 × 720
- 1100 × 800
- 1024 × 768
- 900 × 700
- 820 × 1180
- 768 × 1024
- 430 × 932
- 390 × 844
- 360 × 800
- 320 × 700

The document width remained equal to the viewport width at every tested size, with no horizontal page scrolling.

Targeted visual checks were also performed for the supplied problem areas at approximately the supplied screenshot dimensions:

- Testimonials: 1446 × 807
- Founders: 1387 × 562
- About: 1895 × 837
- Hero/tablet: 728 × 648
- Hero/mobile: 390 × 844

## Code validation

- JavaScript syntax check: passed.
- CSS parser errors: 0.
- Duplicate HTML IDs: none.
- Broken internal navigation targets: none.
- Missing local asset references: none.
- Responsive images retain optimized WebP sources.
- Intrinsic image dimensions added to reduce CLS.
- No-GSAP fallback runtime executed without JavaScript errors in desktop and mobile QA harnesses.

## Browser note

The production page loads GSAP, ScrollTrigger and Lenis from jsDelivr. The layout and fallback were validated in the isolated browser harness; final real-device motion timing should still be checked in Chrome/Edge through a local HTTP server because animation-library CDN loading is restricted inside this build environment.
