import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function pxAmountsInit() {
  if (REDUCED) return;
}

function initSmoothScroll(): void {
  if (REDUCED) return;
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

function initHero(): void {
  const heroSection = document.getElementById('hero-title')?.closest('section');
  if (!heroSection) return;

  const buttons = heroSection.querySelectorAll('a.btn');
  if (REDUCED) return;

  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    el.addEventListener('pointerenter', () => {
      gsap.to(el, {
        boxShadow: '0 14px 30px -8px rgba(0, 0, 0, 0.5)',
        y: -2,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, {
        boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  });
}

function initMarquee(): void {
  const track = document.getElementById('trust-carousel') as HTMLElement | null;
  if (!track || REDUCED) return;

  track.style.animation = 'none';

  const oneSet = () => track.scrollWidth / 3;
  const tween = gsap.to(track, {
    x: () => -oneSet(),
    duration: 15,
    ease: 'none',
    repeat: -1,
  });

  const slow = (to: number) => {
    gsap.to(tween, { timeScale: to, duration: 0.6, ease: 'power2.out' });
  };

  track.addEventListener('pointerenter', () => slow(0.2));
  track.addEventListener('pointerleave', () => slow(1));
}

function initSocialProof(): void {
  const section = document.querySelector('[aria-labelledby="social-proof-title"]');
  if (!section || REDUCED) return;

  const cards = section.querySelectorAll('article');
  gsap.from(cards, {
    y: 15,
    autoAlpha: 0,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.05,
    scrollTrigger: {
      trigger: section,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

function initAvantAvec(): void {
  const section = document.querySelector('[aria-labelledby="avant-apres-title"]');
  if (!section) return;

  const grid = section.querySelector('.grid');
  if (!grid) return;

  const leftItems = grid.querySelectorAll(':scope > div:first-child li');
  const rightItems = grid.querySelectorAll(':scope > div:last-child li');
  if (leftItems.length === 0 || rightItems.length === 0) return;

  if (REDUCED) return;

  gsap.set(rightItems, { autoAlpha: 0, y: 28, filter: 'blur(6px)' });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + Math.max(1100, window.innerHeight * 1.6),
      scrub: 0.7,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.to(leftItems, {
    autoAlpha: 0.25,
    filter: 'blur(2px)',
    x: -10,
    stagger: 0.12,
    ease: 'none',
    duration: 1,
  })
    .to(rightItems, {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      stagger: 0.12,
      ease: 'power3.out',
      duration: 1,
    }, 0.15);
}

function initDemoSections(): void {
  if (REDUCED) return;
  const sections = document.querySelectorAll('[aria-labelledby^="demo-"]');
  sections.forEach((section: Element) => {
    const textCol = section.querySelector('.grid > div:first-child');
    const mockup = section.querySelector('.grid > :last-child');

    if (textCol) {
      gsap.from(textCol, {
        y: 40,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
      });
    }

    if (mockup) {
      gsap.from(mockup, {
        scale: 0.95,
        rotation: -1,
        autoAlpha: 0,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          toggleActions: 'play none none none',
        },
      });

      gsap.fromTo(
        mockup,
        { yPercent: 5 },
        {
          yPercent: -5,
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
  if (REDUCED) return;
  const section = document.querySelector('[aria-labelledby="experience-title"]');
  if (!section) return;

  const frame = section.querySelector('.grid > :first-child');
  const bullets = section.querySelectorAll('.grid > :last-child ul > li');
  const cta = section.querySelector('.grid > :last-child a.btn');

  if (frame) {
    gsap.from(frame, {
      scale: 0.95,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
    });
  }

  if (bullets.length) {
    gsap.from(bullets, {
      y: 24,
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        toggleActions: 'play none none none',
      },
    });
  }

  if (cta) {
    gsap.from(cta, {
      autoAlpha: 0,
      y: 16,
      duration: 0.7,
      ease: 'power3.out',
      delay: 0.35,
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        toggleActions: 'play none none none',
      },
    });
  }
}

function initProfiles(): void {
  const section = document.querySelector('[aria-labelledby="profiles-title"]');
  if (!section || REDUCED) return;

  gsap.from(section.querySelectorAll('article'), {
    y: 30,
    autoAlpha: 0,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: {
      trigger: section,
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
  });
}

function initTestimonials(): void {
  const section = document.querySelector('[aria-labelledby="testimonials-title"]');
  if (!section) return;

  const cards = Array.from(section.querySelectorAll('article'));
  if (!cards.length) return;

  if (!REDUCED) {
    gsap.from(cards, {
      y: 40,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        toggleActions: 'play none none none',
      },
    });
  }

  cards.forEach((card) => {
    const el = card as HTMLElement;
    const others = cards.filter((c) => c !== card);
    el.addEventListener('pointerenter', () => {
      if (REDUCED) return;
      gsap.to(others, { opacity: 0.8, duration: 0.4, ease: 'power2.out' });
      gsap.to(el, { y: -5, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', () => {
      if (REDUCED) return;
      gsap.to(others, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      gsap.to(el, { y: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
  });
}

function init(): void {
  pxAmountsInit();
  initSmoothScroll();
  initHero();
  initMarquee();
  initSocialProof();
  initAvantAvec();
  initDemoSections();
  initExperienceSection();
  initProfiles();
  initTestimonials();

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}