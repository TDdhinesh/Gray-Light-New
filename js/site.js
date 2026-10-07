(() => {
  'use strict';

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (min, value, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, n) => a + (b - a) * n;

  const state = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarsePointer: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    lowPower: false,
    cinematic: false,
    lenis: null,
    activeProject: 0,
    lastFocused: null,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
  };

  state.lowPower = Boolean(
    navigator.connection?.saveData ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  );

  const hasGSAP = () => Boolean(window.gsap && window.ScrollTrigger);
  const canCinematic = () => hasGSAP() && !state.reducedMotion && !state.lowPower && window.innerWidth > 820;

  function initLoader() {
    const loader = qs('#loader');
    if (!loader) return;

    const finishWithoutGsap = () => {
      loader.style.opacity = '0';
      window.setTimeout(() => loader.classList.add('is-done'), 240);
    };

    if (!hasGSAP() || state.reducedMotion) {
      window.setTimeout(finishWithoutGsap, 280);
      return;
    }

    const { gsap } = window;
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => loader.classList.add('is-done')
    });

    tl.to('.loader__line span', { scaleX: 1, duration: 0.42 })
      .to('.loader__word', { y: -10, autoAlpha: 0, duration: 0.22 }, '-=0.08')
      .to('.loader__panel--top', { yPercent: -100, duration: 0.48, ease: 'power4.inOut' }, '-=0.03')
      .to('.loader__panel--bottom', { yPercent: 100, duration: 0.48, ease: 'power4.inOut' }, '<')
      .set(loader, { autoAlpha: 0 });
  }

  function initNavigation() {
    const header = qs('#siteHeader');
    const toggle = qs('#menuToggle');
    const menu = qs('#mobileMenu');
    if (!header || !toggle || !menu) return;

    let headerFrame = 0;
    let menuLastFocus = null;
    const menuLinks = qsa('a[href^="#"]', menu);

    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      headerFrame = 0;
    };

    window.addEventListener('scroll', () => {
      if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
    }, { passive: true });
    updateHeader();

    const setMenu = (open) => {
      const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);

      if (open) {
        menuLastFocus = document.activeElement;
        state.lenis?.stop();
        requestAnimationFrame(() => menuLinks[0]?.focus());
      } else if (wasOpen) {
        state.lenis?.start();
        (menuLastFocus || toggle).focus?.();
      }
    };

    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menuLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

    document.addEventListener('keydown', (event) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
        return;
      }
      if (event.key === 'Tab' && menuLinks.length) {
        const first = menuLinks[0];
        const last = menuLinks.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          toggle.focus();
        } else if (!event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          first.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          toggle.focus();
        }
      }
    });
  }

  function initLenis() {
    if (state.reducedMotion || state.lowPower || !window.Lenis) return;

    state.lenis = new window.Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.05,
      lerp: 0.12,
    });

    if (hasGSAP()) {
      state.lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => state.lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        state.lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }

    qsa('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = link.getAttribute('href');
        if (!target || target === '#') return;
        const el = qs(target);
        if (!el) return;
        event.preventDefault();
        state.lenis.scrollTo(el, { offset: -64, duration: 1.1 });
      });
    });
  }

  function initCursor() {
    if (state.coarsePointer || state.reducedMotion) return;
    const cursor = qs('#cursor');
    if (!cursor) return;
    const label = qs('.cursor__label', cursor);

    const pointer = state.pointer;
    pointer.x = pointer.tx = window.innerWidth / 2;
    pointer.y = pointer.ty = window.innerHeight / 2;
    let rafId = 0;

    const render = () => {
      pointer.x = lerp(pointer.x, pointer.tx, 0.22);
      pointer.y = lerp(pointer.y, pointer.ty, 0.22);
      cursor.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;

      const moving = Math.abs(pointer.x - pointer.tx) > 0.15 || Math.abs(pointer.y - pointer.ty) > 0.15;
      rafId = moving ? requestAnimationFrame(render) : 0;
    };

    const requestRender = () => {
      if (!rafId) rafId = requestAnimationFrame(render);
    };

    document.addEventListener('pointermove', (event) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
      cursor.classList.add('is-visible');
      requestRender();
    }, { passive: true });

    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

    qsa('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        label.textContent = el.dataset.cursor || 'VIEW';
        cursor.classList.add('is-active');
      });
      el.addEventListener('pointerleave', () => {
        label.textContent = '';
        cursor.classList.remove('is-active');
      });
    });
  }

  function initMouseDepth() {
    if (state.coarsePointer || state.reducedMotion || state.lowPower || !hasGSAP()) return;
    const { gsap } = window;
    const heroMedia = qs('.hero__media');
    const aboutStage = qs('.about__stage');
    const teamStage = qs('.team__stage');

    const xHero = heroMedia ? gsap.quickTo(heroMedia, 'x', { duration: 0.65, ease: 'power3.out' }) : null;
    const yHero = heroMedia ? gsap.quickTo(heroMedia, 'y', { duration: 0.65, ease: 'power3.out' }) : null;
    const xAbout = aboutStage ? gsap.quickTo(aboutStage, 'x', { duration: 0.85, ease: 'power3.out' }) : null;
    const yAbout = aboutStage ? gsap.quickTo(aboutStage, 'y', { duration: 0.85, ease: 'power3.out' }) : null;
    const xTeam = teamStage ? gsap.quickTo(teamStage, 'x', { duration: 0.8, ease: 'power3.out' }) : null;
    const yTeam = teamStage ? gsap.quickTo(teamStage, 'y', { duration: 0.8, ease: 'power3.out' }) : null;

    window.addEventListener('pointermove', (event) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      xHero?.(nx * -12); yHero?.(ny * -9);
      xAbout?.(nx * -8); yAbout?.(ny * -6);
      xTeam?.(nx * 10); yTeam?.(ny * 7);
    }, { passive: true });
  }

  function initHero() {
    if (!hasGSAP()) return;
    const { gsap, ScrollTrigger } = window;

    gsap.set('.hero-line > span', { yPercent: 116, rotateX: -12, transformOrigin: '50% 100%' });
    gsap.set(['.hero__kicker', '.hero__lede', '.hero__actions', '.hero__meta', '.scroll-cue'], { autoAlpha: 0, y: 16 });

    gsap.timeline({ delay: 0.52, defaults: { ease: 'power4.out' } })
      .to('.hero-line > span', { yPercent: 0, rotateX: 0, duration: 0.8, stagger: 0.11 })
      .to('.hero__kicker', { autoAlpha: 1, y: 0, duration: 0.45 }, '<')
      .to('.hero__lede', { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.42')
      .to('.hero__actions', { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.36')
      .to(['.hero__meta', '.scroll-cue'], { autoAlpha: 1, y: 0, duration: 0.45 }, '-=0.34');

    if (!state.cinematic) {
      gsap.to('.hero-shot--a img', {
        scale: 1.06,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '+=3400',
        scrub: 1.05,
        pin: '.hero__pin',
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    });

    tl.to('.hero-shot--a img', { scale: 1.18, duration: 1.6 }, 0)
      .to('.hero-shot--a', { xPercent: -10, rotateZ: -0.7, duration: 1.2 }, 0.45)
      .to('.hero__copy', { y: -34, z: 100, duration: 1.2 }, 0.35)
      .to('.hero__vignette', { opacity: .74, duration: .8 }, .75)
      .set('.hero-shot--b', { autoAlpha: 1, clipPath: 'inset(13% 15% 13% 15%)' }, 1.05)
      .to('.hero-shot--b', { scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2 }, 1.05)
      .to('.hero-shot--a', { xPercent: -48, scale: 1.05, rotateZ: -1.4, clipPath: 'inset(0 0 0 36%)', autoAlpha: .2, duration: 1.15 }, 1.12)
      .to('.hero__copy', { y: -90, z: 180, autoAlpha: 0, duration: .75 }, 1.3)
      .to('.hero-shot--b img', { scale: 1.14, duration: 1.25 }, 2.0)
      .to('.hero-shot--b', { xPercent: 8, rotateZ: .55, duration: 1.1 }, 2.08)
      .set('.hero-shot--c', { autoAlpha: 1, clipPath: 'inset(16% 22% 16% 22%)' }, 2.55)
      .to('.hero-shot--c', { scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2 }, 2.55)
      .to('.hero-shot--b', { xPercent: 50, scale: .84, rotateZ: 1.1, autoAlpha: .12, duration: 1.05 }, 2.72)
      .to('.hero-shot--c img', { scale: 1.08, duration: .8 }, 3.18)
      .to('.scroll-cue', { autoAlpha: 0, duration: .2 }, .2);
  }

  function initAbout() {
    if (!hasGSAP()) return;
    const { gsap } = window;

    if (!state.cinematic) {
      gsap.from('.about__copy > *', {
        y: 28,
        autoAlpha: 0,
        stagger: .09,
        duration: .75,
        scrollTrigger: { trigger: '.about__copy', start: 'top 78%' }
      });
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.about',
        start: 'top top',
        end: '+=2500',
        scrub: 1,
        pin: '.about__pin',
        anticipatePin: 1,
      }
    });

    gsap.set('.about__copy', { autoAlpha: 0, y: 55, z: 150 });
    tl.fromTo('.about-shot--primary', { scale: 1.18, xPercent: 17 }, { scale: 1, xPercent: 0, duration: 1.1 }, 0)
      .to('.about__copy', { autoAlpha: 1, y: 0, z: 0, duration: .85 }, .42)
      .to('.about-shot--primary', { xPercent: -16, scale: .86, z: -120, opacity: .64, duration: 1.05 }, 1.0)
      .to('.about-shot--secondary', { autoAlpha: 1, xPercent: -10, yPercent: 11, z: 100, scale: 1.06, duration: 1.0 }, 1.08)
      .to('.about-shot--detail', { autoAlpha: 1, xPercent: -8, yPercent: -8, z: 170, duration: .9 }, 1.26)
      .to('.about__copy', { xPercent: -8, yPercent: -12, duration: .8 }, 1.65)
      .to('.about-shot--secondary', { scale: 1.26, xPercent: -28, yPercent: 1, duration: 1.05 }, 1.82)
      .to('.about-shot--primary', { xPercent: -38, opacity: .2, duration: .85 }, 1.95);
  }

  function initServices() {
    if (!hasGSAP() || !state.cinematic) return;
    const { gsap } = window;
    const scenes = qsa('.service-scene');
    const counter = qs('.services__counter b');
    const progress = qs('.services__progress span');
    if (!scenes.length) return;

    scenes.forEach((scene, index) => {
      gsap.set(scene, { autoAlpha: index === 0 ? 1 : 0 });
      const media = qs('.service-scene__media', scene);
      const copy = qs('.service-scene__copy', scene);
      if (index === 0) {
        gsap.set(media, { scale: 1, clipPath: 'inset(0% 0% 0% 0%)' });
        gsap.set(copy, { autoAlpha: 1, y: 0 });
      } else {
        gsap.set(media, { scale: 1.08, clipPath: index % 2 ? 'inset(9% 36% 9% 4%)' : 'inset(9% 4% 9% 36%)' });
        gsap.set(copy, { autoAlpha: 0, y: 50 });
      }
    });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.services',
        start: 'top top',
        end: `+=${scenes.length * 980}`,
        scrub: .9,
        pin: '.services__pin',
        anticipatePin: 1,
        onUpdate: (self) => {
          const idx = clamp(0, Math.floor(self.progress * scenes.length), scenes.length - 1);
          counter.textContent = String(idx + 1).padStart(2, '0');
          gsap.set(progress, { scaleX: self.progress });
        }
      }
    });

    for (let i = 0; i < scenes.length - 1; i += 1) {
      const current = scenes[i];
      const next = scenes[i + 1];
      const currentMedia = qs('.service-scene__media', current);
      const currentImage = qs('img', currentMedia);
      const currentCopy = qs('.service-scene__copy', current);
      const nextMedia = qs('.service-scene__media', next);
      const nextCopy = qs('.service-scene__copy', next);
      const at = i * 1.35;

      tl.to(currentImage, { scale: 1.14, duration: .82 }, at)
        .to(currentMedia, { xPercent: i % 2 ? 10 : -10, rotateZ: i % 2 ? .45 : -.45, scale: .91, opacity: .34, duration: .95 }, at + .18)
        .to(currentCopy, { y: -70, autoAlpha: 0, duration: .55 }, at + .18)
        .set(next, { autoAlpha: 1 }, at + .5)
        .to(nextMedia, { scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: .78 }, at + .52)
        .to(nextCopy, { y: 0, autoAlpha: 1, duration: .62 }, at + .7)
        .set(current, { autoAlpha: 0 }, at + 1.28);
    }
  }

  function initPortfolio() {
    const cards = qsa('.project-card');
    if (!cards.length) return;

    if (hasGSAP() && !state.coarsePointer && !state.reducedMotion) {
      const { gsap } = window;
      cards.forEach((card) => {
        const rotateXTo = gsap.quickTo(card, 'rotationX', { duration: .35, ease: 'power2.out' });
        const rotateYTo = gsap.quickTo(card, 'rotationY', { duration: .35, ease: 'power2.out' });
        card.addEventListener('pointermove', (event) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          rotateXTo(y * -2.4);
          rotateYTo(x * 3.4);
        });
        card.addEventListener('pointerleave', () => { rotateXTo(0); rotateYTo(0); });
      });
    }

    if (!hasGSAP() || !state.cinematic) return;
    const { gsap } = window;

    const initial = [
      { x: '0vw', y: '0vh', z: 60, scale: 1, opacity: 1, rotateZ: 0 },
      { x: '38vw', y: '7vh', z: -160, scale: .82, opacity: .42, rotateZ: 1.3 },
      { x: '-42vw', y: '13vh', z: -220, scale: .78, opacity: .30, rotateZ: -1.2 },
      { x: '46vw', y: '2vh', z: -260, scale: .76, opacity: .24, rotateZ: 1.0 },
      { x: '0vw', y: '52vh', z: -320, scale: .72, opacity: .18, rotateZ: -.6 },
    ];
    cards.forEach((card, i) => gsap.set(card, initial[i]));

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.portfolio',
        start: 'top top',
        end: `+=${cards.length * 1050}`,
        scrub: 1,
        pin: '.portfolio__pin',
        anticipatePin: 1,
      }
    });

    for (let i = 0; i < cards.length - 1; i += 1) {
      const current = cards[i];
      const next = cards[i + 1];
      const at = i * 1.18;
      const exitX = i % 2 === 0 ? '-52vw' : '52vw';
      const enterRotate = i % 2 === 0 ? -0.8 : 0.8;

      tl.to(current, { x: exitX, y: '-8vh', z: -260, scale: .7, opacity: .18, rotateZ: enterRotate, duration: .92 }, at)
        .to(qs('img', current), { scale: 1.1, duration: .92 }, at)
        .to(next, { x: '0vw', y: '0vh', z: 70, scale: 1, opacity: 1, rotateZ: 0, duration: 1.0 }, at + .22)
        .to(qs('img', next), { scale: 1, duration: 1.0 }, at + .22);
    }
  }

  function initFilm() {
    if (!hasGSAP()) return;
    const { gsap } = window;

    if (!state.cinematic) {
      gsap.from('.film__frame', {
        scale: .9,
        autoAlpha: .6,
        duration: 1,
        scrollTrigger: { trigger: '.film', start: 'top 82%', end: 'bottom 25%', scrub: true }
      });
      return;
    }

    gsap.set('.film__copy', { autoAlpha: .45, y: 45 });
    gsap.set('.film__metadata', { autoAlpha: 0, y: 18 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.film',
        start: 'top top',
        end: '+=2200',
        scrub: 1,
        pin: '.film__pin',
        anticipatePin: 1,
      }
    });

    tl.fromTo('.film__frame', { scale: .78, xPercent: 7 }, { scale: 1, xPercent: 0, duration: 1.0 }, 0)
      .to('.film__copy', { autoAlpha: 1, y: 0, duration: .72 }, .3)
      .to('.film__metadata', { autoAlpha: 1, y: 0, duration: .58 }, .58)
      .to('.film__frame img', { scale: 1.16, xPercent: -5, duration: 1.15 }, 1.0)
      .to('.film__frame', { scale: 1.52, duration: 1.15 }, 1.08)
      .to('.film__copy', { xPercent: -6, yPercent: -12, duration: .85 }, 1.22)
      .to('.film__metadata', { xPercent: 12, duration: .75 }, 1.34);
  }

  function initTeam() {
    if (!hasGSAP() || state.reducedMotion) return;
    const { gsap } = window;
    const trigger = '.team';

    gsap.from('.team__header > *', {
      y: 30,
      autoAlpha: 0,
      stagger: .1,
      duration: .8,
      scrollTrigger: { trigger, start: 'top 72%' }
    });

    if (window.innerWidth <= 820 || state.lowPower) return;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger, start: 'top 65%', end: 'bottom 28%', scrub: .85 }
    });
    tl.to('.portrait--vicky', { x: '12vw', y: '8vh', z: -90, scale: .88, rotateZ: 1.2, opacity: .68, duration: 1 }, 0)
      .to('.portrait--praveen', { x: '-12vw', y: '-7vh', z: 100, scale: 1.06, rotateZ: -1.2, opacity: 1, duration: 1 }, 0)
      .to('.team__word', { xPercent: -44, z: 80, duration: 1 }, 0);
  }

  function initProcess() {
    if (!hasGSAP() || !state.cinematic) return;
    const { gsap } = window;
    const rail = qs('.process__rail');
    const steps = qsa('.process-step');
    const progress = qs('.process__progress span');
    if (!rail || !steps.length) return;

    gsap.to(rail, {
      x: () => -(rail.scrollWidth - window.innerWidth + window.innerWidth * .18),
      ease: 'none',
      scrollTrigger: {
        trigger: '.process',
        start: 'top top',
        end: '+=3000',
        scrub: 1,
        pin: '.process__pin',
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = clamp(0, Math.round(self.progress * (steps.length - 1)), steps.length - 1);
          steps.forEach((step, i) => step.classList.toggle('is-active', i === idx));
          gsap.set(progress, { scaleX: self.progress });
          steps.forEach((step, i) => gsap.set(step, { scale: i === idx ? 1 : .86 }));
        }
      }
    });
  }

  function initTestimonials() {
    const quotes = qsa('.quote');
    const dots = qsa('.quote-dots button');
    if (!quotes.length) return;
    let active = 0;

    const show = (index, animate = true) => {
      const next = clamp(0, index, quotes.length - 1);
      if (next === active && quotes[next].classList.contains('is-active')) return;

      quotes.forEach((quote, i) => {
        const isNext = i === next;
        quote.classList.toggle('is-active', isNext);

        // GSAP writes inline opacity/transform values. Explicitly reset every
        // inactive quote so a previously animated quote can never remain visible
        // and overlap the active testimonial.
        if (hasGSAP()) {
          window.gsap.killTweensOf(quote);
          if (!isNext) window.gsap.set(quote, { autoAlpha: 0, y: 24 });
        }
      });

      dots.forEach((dot, i) => {
        const selected = i === next;
        dot.classList.toggle('is-active', selected);
        dot.setAttribute('aria-selected', String(selected));
      });

      if (hasGSAP()) {
        if (animate && !state.reducedMotion) {
          window.gsap.fromTo(
            quotes[next],
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: .5, ease: 'power3.out', overwrite: true }
          );
        } else {
          window.gsap.set(quotes[next], { y: 0, autoAlpha: 1 });
        }
      }

      active = next;
    };

    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));

    if (hasGSAP() && state.cinematic && window.innerHeight >= 680) {
      window.ScrollTrigger.create({
        trigger: '.testimonials',
        start: 'top top',
        end: '+=1800',
        pin: '.testimonials',
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => show(Math.min(quotes.length - 1, Math.floor(self.progress * quotes.length))),
      });
    }
  }

  function initContact() {
    const form = qs('#contactForm');
    const status = qs('#formStatus');
    if (!form || !status) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = 'Please complete the required fields.';
        return;
      }

      const data = new FormData(form);
      const subject = encodeURIComponent(`Gray Light Studio enquiry — ${data.get('service') || 'Session'}`);
      const body = encodeURIComponent(
        `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nPhone: ${data.get('phone')}\nService: ${data.get('service')}\nEvent Date: ${data.get('date') || 'Not specified'}\n\nMessage:\n${data.get('message')}`
      );

      status.textContent = "THANK YOU. WE'LL BE IN TOUCH.";
      form.classList.add('is-sent');
      window.setTimeout(() => {
        window.location.href = `mailto:hello@graylightstudio.in?subject=${subject}&body=${body}`;
      }, 260);
    });

    if (hasGSAP() && !state.reducedMotion) {
      const { gsap } = window;
      gsap.to('.contact__background img', {
        scale: 1,
        yPercent: -4,
        ease: 'none',
        scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.from('.contact__title > *', {
        yPercent: 105,
        autoAlpha: 0,
        stagger: .1,
        duration: .9,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.contact__title', start: 'top 80%' }
      });
    }
  }

  function initPortfolioLightbox() {
    const modal = qs('#lightbox');
    if (!modal) return;
    const image = qs('#lightboxImage');
    const title = qs('#lightboxTitle');
    const meta = qs('#lightboxMeta');
    const index = qs('#lightboxIndex');
    const close = qs('.lightbox__close', modal);
    const prev = qs('.lightbox__nav--prev', modal);
    const next = qs('.lightbox__nav--next', modal);

    const projects = [
      { title: 'Wedding', meta: 'Omalur · Salem', src: 'assets/optimized/wedd-1920.webp', alt: 'Wedding ceremony project' },
      { title: 'Portrait', meta: 'Studio · Salem', src: 'assets/optimized/port-1200.webp', alt: 'Editorial bridal portrait' },
      { title: 'Editorial', meta: 'Coast · Tamil Nadu', src: 'assets/optimized/out-1920.webp', alt: 'Outdoor couple editorial' },
      { title: 'Event', meta: 'Celebration · Salem', src: 'assets/optimized/event-f-1600.webp', alt: 'Family celebration event' },
      { title: 'Commercial', meta: 'Brand story', src: 'assets/optimized/commer-1600.webp', alt: 'Commercial brand project' },
    ];

    const render = (i) => {
      state.activeProject = (i + projects.length) % projects.length;
      const project = projects[state.activeProject];
      image.src = project.src;
      image.alt = project.alt;
      title.textContent = project.title;
      meta.textContent = project.meta;
      index.textContent = `${String(state.activeProject + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
    };

    const open = (i, trigger) => {
      state.lastFocused = trigger;
      render(i);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-lightbox-open');
      state.lenis?.stop();
      close.focus();
      if (hasGSAP() && !state.reducedMotion) {
        window.gsap.fromTo('.lightbox__figure', { scale: .92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .55, ease: 'power3.out' });
      }
    };

    const shut = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-lightbox-open');
      state.lenis?.start();
      state.lastFocused?.focus?.();
    };

    qsa('.project-card').forEach((card) => card.addEventListener('click', () => open(Number(card.dataset.project), card)));
    close.addEventListener('click', shut);
    qs('.lightbox__backdrop', modal).addEventListener('click', shut);
    prev.addEventListener('click', () => render(state.activeProject - 1));
    next.addEventListener('click', () => render(state.activeProject + 1));

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') shut();
      if (event.key === 'ArrowLeft') render(state.activeProject - 1);
      if (event.key === 'ArrowRight') render(state.activeProject + 1);
      if (event.key === 'Tab') {
        const focusables = [close, prev, next].filter(Boolean);
        const current = focusables.indexOf(document.activeElement);
        if (event.shiftKey && current === 0) { event.preventDefault(); focusables.at(-1).focus(); }
        else if (!event.shiftKey && current === focusables.length - 1) { event.preventDefault(); focusables[0].focus(); }
      }
    });
  }

  function initMagnetic() {
    if (state.coarsePointer || state.reducedMotion || !hasGSAP()) return;
    const { gsap } = window;
    qsa('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: .35, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: .35, ease: 'power3.out' });
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        xTo((event.clientX - rect.left - rect.width / 2) * .12);
        yTo((event.clientY - rect.top - rect.height / 2) * .16);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  function initRevealFallbacks() {
    if (!('IntersectionObserver' in window)) return;
    const targets = qsa('.stat, .team__header, .contact-form, .endcard__inner');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    }, { threshold: .14 });
    targets.forEach((el) => observer.observe(el));
  }

  function boot() {
    if (hasGSAP()) window.gsap.registerPlugin(window.ScrollTrigger);
    state.cinematic = canCinematic();
    document.documentElement.classList.toggle('is-enhanced', state.cinematic);
    document.body.classList.toggle('is-lite', state.lowPower || state.reducedMotion || !hasGSAP());

    initLoader();
    initNavigation();
    initLenis();
    initCursor();
    initMouseDepth();
    initPortfolioLightbox();
    initContact();
    initRevealFallbacks();

    if (hasGSAP()) {
      initHero();
      initAbout();
      initServices();
      initPortfolio();
      initFilm();
      initTeam();
      initProcess();
      initTestimonials();
      initMagnetic();
      window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
    } else {
      initTestimonials();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
