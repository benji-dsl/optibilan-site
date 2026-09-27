import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE = 'power3.out';
const EASE_SOFT = 'power4.out';

function refreshLater(): void {
  window.addEventListener('load', () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 800);
  setTimeout(() => ScrollTrigger.refresh(), 2000);
}

function initSmoothScroll(lenis: Lenis): void {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function setupLenis(): Lenis {
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });
  initSmoothScroll(lenis);
  return lenis;
}

function reveal(el: Element, vars: gsap.TweenVars = {}, trigger?: Element): void {
  gsap.fromTo(
    el,
    {
      autoAlpha: 0,
      y: vars.y ?? 40,
      ...(vars.from || {}),
    },
    {
      autoAlpha: 1,
      y: 0,
      duration: vars.duration ?? 0.8,
      ease: vars.ease ?? EASE,
      delay: vars.delay ?? 0,
      scrollTrigger: {
        trigger: trigger ?? el,
        start: vars.start ?? 'top 88%',
        toggleActions: 'play none none none',
      },
    },
  );
}

function initHero(): void {
  const heroSection = document.getElementById('hero-title')?.closest('section');
  if (!heroSection) return;

  const buttons = heroSection.querySelectorAll('a.btn');
  if (REDUCED) return;
  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    const enter = () => {
      gsap.to(el, {
        boxShadow: '0 16px 34px -10px rgba(0,0,0,0.55)',
        y: -2,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };
    const leave = () => {
      gsap.to(el, {
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
  });
}

function initMarquee(): void {
  const track = document.getElementById('trust-carousel') as HTMLElement | null;
  if (!track) return;

  track.style.animation = 'none';

  const oneSet = () => track.scrollWidth / 3;

  const tween = gsap.to(track, {
    x: () => -oneSet(),
    duration: 18,
    ease: 'none',
    repeat: -1,
  });

  if (REDUCED) return;

  const slow = (to: number) => {
    gsap.to(tween, { timeScale: to, duration: 0.6, ease: 'power2.out' });
  };
  track.addEventListener('pointerenter', () => slow(0.2));
  track.addEventListener('pointerleave', () => slow(1));
}

function initSocialProof(): void {
  const section = document.querySelector('[aria-labelledby="social-proof-title"]');
  if (!section) return;
  const cards = section.querySelectorAll('article');
  cards.forEach((card, i) => {
    reveal(card, { y: 15, duration: 0.7, delay: i * 0.05 }, section);
  });
}

function initAvantAvec(): void {
  const section = document.querySelector('[aria-labelledby="avant-apres-title"]');
  if (!section) return;

  const grid = section.querySelector('.grid');
  if (!grid) return;

  const leftItems = grid.querySelectorAll(':scope > div:first-child li');
  const rightItems = grid.querySelectorAll(':scope > div:last-child li');
  if (!leftItems.length || !rightItems.length) return;

  if (REDUCED) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 75%',
      end: 'bottom 65%',
      scrub: 0.6,
      toggleActions: 'play none none reverse',
    },
  });

  tl.to(leftItems, {
    autoAlpha: 0.35,
    filter: 'blur(1.5px)',
    stagger: 0.08,
    ease: 'none',
    duration: 1,
  }).to(
    rightItems,
    {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      stagger: 0.08,
      ease: EASE,
    },
    0.2,
  );
}

function initDemoSections(): void {
  const sections = document.querySelectorAll('[aria-labelledby^="demo-"]');
  sections.forEach((section: Element) => {
    const textCol = section.querySelector('.grid > div:first-child');
    const mockup = section.querySelector('.grid > :last-child');
    const isRtl = (section.querySelector('.grid') as HTMLElement | null)?.style
      .direction === 'rtl';

    if (textCol && !REDUCED) {
      gsap.fromTo(
        textCol,
        { autoAlpha: 0, x: isRtl ? 60 : -60 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.9,
          ease: EASE,
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        },
      );
    }

    if (mockup) {
      const dir = isRtl ? -1 : 1;
      if (!REDUCED) {
        gsap.fromTo(
          mockup,
          { autoAlpha: 0, x: 90 * dir, scale: 0.94 },
          {
            autoAlpha: 1,
            x: 0,
            scale: 1,
            duration: 1.15,
            ease: EASE_SOFT,
            scrollTrigger: {
              trigger: section,
              start: 'top 78%',
              toggleActions: 'play none none none',
            },
          },
        );
      }

      if (REDUCED) return;

      gsap.fromTo(
        mockup,
        { yPercent: -6 * dir },
        {
          yPercent: 6 * dir,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    }
  });
}

function initExperienceSection(): void {
  const section = document.querySelector('[aria-labelledby="experience-title"]');
  if (!section) return;

  const frame = section.querySelector('.grid > :first-child');
  const bullets = section.querySelectorAll('.grid > :last-child ul > li');
  const cta = section.querySelector('.grid > :last-child a.btn');

  if (frame && !REDUCED) {
    gsap.fromTo(
      frame,
      { autoAlpha: 0, x: -80, scale: 0.95 },
      {
        autoAlpha: 1,
        x: 0,
        scale: 1,
        duration: 1.1,
        ease: EASE_SOFT,
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      },
    );
  }

  if (bullets.length && !REDUCED) {
    bullets.forEach((b, i) => {
      reveal(b, { y: 24, duration: 0.7, delay: i * 0.08 }, section);
    });
  }

  if (cta && !REDUCED) {
    reveal(cta, { y: 16, duration: 0.7, delay: 0.4 }, section);
  }
}

function initProfiles(): void {
  const section = document.querySelector('[aria-labelledby="profiles-title"]');
  if (!section) return;
  const cards = section.querySelectorAll('article');
  cards.forEach((card, i) => {
    reveal(card, { y: 30, duration: 0.7, delay: i * 0.08 }, section);
  });
}

function initTestimonials(): void {
  const section = document.querySelector('[aria-labelledby="testimonials-title"]');
  if (!section) return;

  const cards = Array.from(section.querySelectorAll('article'));
  if (!cards.length) return;

  cards.forEach((card, i) => {
    reveal(card, { y: 40, duration: 0.8, delay: i * 0.12 }, section);
  });

  if (REDUCED) return;

  cards.forEach((card) => {
    const el = card as HTMLElement;
    const others = cards.filter((c) => c !== card);
    const enter = () => {
      gsap.to(others, { opacity: 0.8, duration: 0.4, ease: 'power2.out' });
      gsap.to(el, { y: -5, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    };
    const leave = () => {
      gsap.to(others, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      gsap.to(el, { y: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
  });
}

function init(): void {
  const lenis = setupLenis();

  initHero();
  initMarquee();
  initSocialProof();
  initAvantAvec();
  initDemoSections();
  initExperienceSection();
  initProfiles();
  initTestimonials();

  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (!img.complete) {
      img.addEventListener('load', () => ScrollTrigger.refresh());
    }
  });

  refreshLater();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}