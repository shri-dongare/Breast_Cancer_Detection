/* ==========================================================================
   about.js
   Production-ready vanilla JavaScript for the About page.

   Assumes the existing about.html / about.css expose (where applicable):
     - .navbar                          sticky navbar wrapper
     - .navbar a[href^="#"]             in-page nav links
     - .nav-link                        (optional) explicit nav link class
     - section[id]                     page sections used for scrollspy
     - .scroll-progress                scroll progress bar (width driven)
     - .reveal                         elements to fade/slide in on scroll
     - [data-count]                    elements holding a target number to count up to
     - .faq-item / .faq-question /
       .faq-answer                     FAQ accordion structure
     - .btn, .ripple                   elements that should show a ripple on click
     - .particles                      container that floating particles are injected into
     - .aurora                         aurora background element animated via CSS vars
     - [data-parallax]                 elements that shift with mouse movement
     - .floating-card                  hero floating cards (parallax + drift)
     - .timeline-item                  timeline entries revealed in sequence
     - .tech-card                      technology cards with tilt-on-hover
     - .stat-number / [data-count]     statistics counters
     - .back-to-top                    back-to-top button
     - .loader / #loader / .page-loader loading screen overlay

   Every feature is defensive: if an expected element/class isn't present,
   that feature simply no-ops instead of throwing.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     0. Shared helpers & state
     ------------------------------------------------------------------------ */

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Central place to track listeners/observers/rAF ids we create so that
  // (if the page ever needs it) everything can be torn down cleanly and to
  // guarantee we never leak intervals/observers.
  const cleanupRegistry = [];
  function registerCleanup(fn) {
    cleanupRegistry.push(fn);
  }
  window.addEventListener('pagehide', () => {
    cleanupRegistry.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        /* swallow - teardown should never break navigation */
      }
    });
  });

  /**
   * Debounce: waits `wait` ms of silence before invoking `fn`.
   */
  function debounce(fn, wait = 150) {
    let timeoutId = null;
    function debounced(...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
    }
    debounced.cancel = () => window.clearTimeout(timeoutId);
    return debounced;
  }

  /**
   * Throttle via requestAnimationFrame: at most one invocation per frame.
   */
  function rafThrottle(fn) {
    let ticking = false;
    let lastArgs = null;
    function throttled(...args) {
      lastArgs = args;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          fn.apply(this, lastArgs);
          ticking = false;
        });
      }
    }
    return throttled;
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /* ------------------------------------------------------------------------
     1. Page loading animation
     ------------------------------------------------------------------------ */

  function initLoader() {
    const loader = document.querySelector('.loader, #loader, .page-loader');
    if (!loader) return;

    function hideLoader() {
      loader.classList.add('loader--hidden', 'is-hidden');
      loader.setAttribute('aria-hidden', 'true');
      // Remove from the accessibility/interaction tree after the CSS
      // transition finishes (fallback to a fixed timeout if unknown).
      const duration = prefersReducedMotion ? 0 : 500;
      window.setTimeout(() => {
        if (loader.parentNode) {
          loader.style.display = 'none';
        }
      }, duration);
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-loaded');
    }

    if (document.readyState === 'complete') {
      hideLoader();
    } else {
      window.addEventListener('load', hideLoader, { once: true });
    }
  }

  /* ------------------------------------------------------------------------
     2. Sticky navbar + background change on scroll
     ------------------------------------------------------------------------ */

  function initNavbarScrollState() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const SCROLL_THRESHOLD = 40;
    let lastKnownScrollY = window.scrollY;

    const updateNavbar = () => {
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      navbar.classList.toggle('navbar--scrolled', scrolled);
      navbar.classList.toggle('scrolled', scrolled); // alt naming support
    };

    const onScroll = rafThrottle(() => {
      lastKnownScrollY = window.scrollY;
      updateNavbar();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    updateNavbar(); // set correct initial state (e.g. on reload mid-page)

    registerCleanup(() => window.removeEventListener('scroll', onScroll));
  }

  /* ------------------------------------------------------------------------
     3. Scroll progress bar
     ------------------------------------------------------------------------ */

  function initScrollProgressBar() {
    const progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) return;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${clamp(progress, 0, 100)}%`;
    };

    const onScroll = rafThrottle(updateProgress);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', debounce(updateProgress, 150));
    updateProgress();

    registerCleanup(() => window.removeEventListener('scroll', onScroll));
  }

  /* ------------------------------------------------------------------------
     4. Smooth scrolling for in-page nav links
     ------------------------------------------------------------------------ */

  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    if (!links.length) return;

    const navbar = document.querySelector('.navbar');

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return; // not an in-page anchor we control

        event.preventDefault();

        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const targetY =
          target.getBoundingClientRect().top + window.scrollY - navbarHeight;

        window.scrollTo({
          top: targetY,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });

        // Update the URL hash without an extra jump.
        if (history.pushState) {
          history.pushState(null, '', targetId);
        }

        // Close a mobile nav menu if one is open (common pattern; no-ops
        // safely if these classes/elements don't exist).
        document
          .querySelector('.navbar')
          ?.classList.remove('nav-open', 'menu-open');
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. Active navigation highlighting (scrollspy via IntersectionObserver)
     ------------------------------------------------------------------------ */

  function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll(
      '.navbar a[href^="#"], .nav-link[href^="#"]'
    );
    if (!sections.length || !navLinks.length) return;

    const linkMap = new Map();
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        linkMap.set(href.slice(1), link);
      }
    });

    const setActive = (id) => {
      navLinks.forEach((link) => link.classList.remove('active'));
      const activeLink = linkMap.get(id);
      if (activeLink) activeLink.classList.add('active');
    };

    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;

    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the entry that is most visible / closest to the top.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: `-${navbarHeight + 10}px 0px -60% 0px`,
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((section) => observer.observe(section));
    registerCleanup(() => observer.disconnect());
  }

  /* ------------------------------------------------------------------------
     6. Scroll reveal animations (fade/slide-in via IntersectionObserver)
     ------------------------------------------------------------------------ */

  function initRevealAnimations() {
    const revealEls = document.querySelectorAll(
      '.reveal, [data-reveal], .timeline-item, .tech-card'
    );
    if (!revealEls.length) return;

    if (prefersReducedMotion) {
      // Skip animation but still make content visible.
      revealEls.forEach((el) => el.classList.add('is-visible', 'revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.getAttribute('data-delay');
            if (delay) {
              el.style.transitionDelay = `${delay}ms`;
            }
            el.classList.add('is-visible', 'revealed');
            obs.unobserve(el); // animate once only
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
    registerCleanup(() => observer.disconnect());
  }

  /* ------------------------------------------------------------------------
     7. Animated counters / statistics
     ------------------------------------------------------------------------ */

  function animateCounter(el) {
    const target = parseFloat(
      el.getAttribute('data-count') || el.textContent || '0'
    );
    if (Number.isNaN(target)) return;

    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const duration = parseInt(el.getAttribute('data-duration') || '1600', 10);

    if (prefersReducedMotion) {
      el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
      return;
    }

    let startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = easeOutCubic(progress);
      const current = target * eased;

      el.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
      }
    }

    window.requestAnimationFrame(step);
  }

  function initCounters() {
    const counters = document.querySelectorAll(
      '[data-count], .stat-number[data-count]'
    );
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((counter) => observer.observe(counter));
    registerCleanup(() => observer.disconnect());
  }

  /* ------------------------------------------------------------------------
     8. FAQ accordion
     ------------------------------------------------------------------------ */

  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      // Ensure a defined starting height for the collapse transition.
      answer.style.overflow = 'hidden';
      if (!item.classList.contains('active')) {
        answer.style.maxHeight = '0px';
      } else {
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }

      question.setAttribute('role', question.getAttribute('role') || 'button');
      question.setAttribute('tabindex', question.getAttribute('tabindex') || '0');
      question.setAttribute(
        'aria-expanded',
        item.classList.contains('active') ? 'true' : 'false'
      );

      const toggle = () => {
        const isOpen = item.classList.contains('active');

        // Close sibling items for a classic single-open accordion.
        faqItems.forEach((sibling) => {
          if (sibling !== item) {
            sibling.classList.remove('active');
            const siblingAnswer = sibling.querySelector('.faq-answer');
            const siblingQuestion = sibling.querySelector('.faq-question');
            if (siblingAnswer) siblingAnswer.style.maxHeight = '0px';
            if (siblingQuestion)
              siblingQuestion.setAttribute('aria-expanded', 'false');
          }
        });

        item.classList.toggle('active', !isOpen);
        question.setAttribute('aria-expanded', String(!isOpen));
        answer.style.maxHeight = !isOpen ? `${answer.scrollHeight}px` : '0px';
      };

      question.addEventListener('click', toggle);
      question.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });

    // Keep open answer heights correct if content reflows (e.g. font
    // loading, resize) by recalculating the active item's max-height.
    const recalcOpen = debounce(() => {
      faqItems.forEach((item) => {
        if (item.classList.contains('active')) {
          const answer = item.querySelector('.faq-answer');
          if (answer) answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
      });
    }, 150);
    window.addEventListener('resize', recalcOpen);
    registerCleanup(() => window.removeEventListener('resize', recalcOpen));
  }

  /* ------------------------------------------------------------------------
     9. Ripple button effect
     ------------------------------------------------------------------------ */

  function createRipple(event, el) {
    if (prefersReducedMotion) return;

    const rect = el.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    const rippleX =
      (event.clientX ?? rect.left + rect.width / 2) - rect.left - radius;
    const rippleY =
      (event.clientY ?? rect.top + rect.height / 2) - rect.top - radius;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.position = 'absolute';
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${rippleX}px`;
    ripple.style.top = `${rippleY}px`;
    ripple.style.borderRadius = '50%';
    ripple.style.pointerEvents = 'none';
    ripple.style.background = 'currentColor';
    ripple.style.opacity = '0.35';
    ripple.style.transform = 'scale(0)';
    ripple.style.transition = 'transform 600ms ease-out, opacity 600ms ease-out';

    // The parent needs relative positioning + hidden overflow for a
    // contained ripple; this only touches inline styles, never CSS files.
    const computedPosition = window.getComputedStyle(el).position;
    if (computedPosition === 'static') {
      el.style.position = 'relative';
    }
    el.style.overflow = 'hidden';

    el.appendChild(ripple);

    // Kick off the animation on the next frame so the transition fires.
    window.requestAnimationFrame(() => {
      ripple.style.transform = 'scale(2.5)';
      ripple.style.opacity = '0';
    });

    window.setTimeout(() => ripple.remove(), 650);
  }

  function initRippleEffect() {
    const rippleTargets = document.querySelectorAll('.btn, .ripple');
    if (!rippleTargets.length) return;

    rippleTargets.forEach((el) => {
      el.addEventListener('click', (event) => createRipple(event, el));
    });
  }

  /* ------------------------------------------------------------------------
     10. Floating particles animation
     ------------------------------------------------------------------------ */

  function initFloatingParticles() {
    const container = document.querySelector('.particles');
    if (!container || prefersReducedMotion) return;

    const PARTICLE_COUNT = clamp(
      parseInt(container.getAttribute('data-count') || '30', 10),
      0,
      80
    );

    const fragment = document.createDocumentFragment();
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'particle';

      const size = Math.random() * 4 + 2; // 2px - 6px
      const startX = Math.random() * 100; // vw%
      const duration = Math.random() * 12 + 10; // 10s - 22s
      const delay = Math.random() * -duration; // negative = already mid-flight

      particle.style.position = 'absolute';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${startX}%`;
      particle.style.bottom = '-10px';
      particle.style.borderRadius = '50%';
      particle.style.background = 'currentColor';
      particle.style.opacity = String(Math.random() * 0.5 + 0.2);
      particle.style.willChange = 'transform, opacity';
      particle.style.animation = `particleFloat ${duration}s linear ${delay}s infinite`;

      fragment.appendChild(particle);
      particles.push(particle);
    }

    // Inject the keyframes once, only if not already defined in the CSS.
    if (!document.getElementById('particle-float-keyframes')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'particle-float-keyframes';
      styleTag.textContent = `
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-50vh) translateX(15px); }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(-15px); opacity: 0; }
        }
      `;
      document.head.appendChild(styleTag);
    }

    container.appendChild(fragment);

    registerCleanup(() => {
      particles.forEach((p) => p.remove());
    });
  }

  /* ------------------------------------------------------------------------
     11. Aurora background animation
     ------------------------------------------------------------------------ */

  function initAuroraAnimation() {
    const aurora = document.querySelector('.aurora');
    if (!aurora || prefersReducedMotion) return;

    let angle = 0;
    let rafId = null;

    function animate() {
      angle = (angle + 0.05) % 360;
      // Drive a hue-rotation / gradient-angle CSS custom property; the
      // existing CSS is expected to consume --aurora-angle in a gradient.
      aurora.style.setProperty('--aurora-angle', `${angle}deg`);
      rafId = window.requestAnimationFrame(animate);
    }

    rafId = window.requestAnimationFrame(animate);

    registerCleanup(() => {
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }

  /* ------------------------------------------------------------------------
     12. Mouse parallax (generic [data-parallax] + hero floating cards)
     ------------------------------------------------------------------------ */

  function initMouseParallax() {
    if (prefersReducedMotion) return;

    const parallaxEls = document.querySelectorAll('[data-parallax]');
    const floatingCards = document.querySelectorAll('.floating-card');
    const hero = document.querySelector('.hero, .hero-section') || document.body;

    if (!parallaxEls.length && !floatingCards.length) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;

    const onPointerMove = (event) => {
      const rect = hero.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = relX;
      targetY = relY;
    };

    // Smoothly interpolate towards the pointer position every frame for a
    // fluid, non-jittery parallax feel instead of snapping directly.
    function animate() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      parallaxEls.forEach((el) => {
        const strength = parseFloat(el.getAttribute('data-parallax')) || 20;
        el.style.transform = `translate3d(${(-currentX * strength).toFixed(
          2
        )}px, ${(-currentY * strength).toFixed(2)}px, 0)`;
      });

      floatingCards.forEach((card, index) => {
        // Slight per-card variance so cards don't move in perfect lockstep.
        const depth = 12 + index * 6;
        card.style.transform = `translate3d(${(-currentX * depth).toFixed(
          2
        )}px, ${(-currentY * depth).toFixed(2)}px, 0)`;
      });

      rafId = window.requestAnimationFrame(animate);
    }

    hero.addEventListener('mousemove', onPointerMove, { passive: true });
    hero.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
    });

    rafId = window.requestAnimationFrame(animate);

    registerCleanup(() => {
      hero.removeEventListener('mousemove', onPointerMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }

  /* ------------------------------------------------------------------------
     13. Hero floating cards idle drift
     ------------------------------------------------------------------------ */

  function initHeroFloatingCardsDrift() {
    const cards = document.querySelectorAll('.floating-card');
    if (!cards.length || prefersReducedMotion) return;

    cards.forEach((card, index) => {
      // Stagger each card's drift animation so they don't move in unison.
      // Relies on the CSS having a keyframe (e.g. "float") applied via
      // this class; we only control timing/offset here.
      card.style.animationDelay = `${index * 0.35}s`;
      card.style.animationDuration = `${5 + (index % 3)}s`;
    });
  }

  /* ------------------------------------------------------------------------
     14. Technology card hover / tilt animation
     ------------------------------------------------------------------------ */

  function initTechCardTilt() {
    const cards = document.querySelectorAll('.tech-card');
    if (!cards.length || prefersReducedMotion) return;

    const MAX_TILT = 8; // degrees

    cards.forEach((card) => {
      let rafId = null;

      const onMove = (event) => {
        const rect = card.getBoundingClientRect();
        const relX = (event.clientX - rect.left) / rect.width;
        const relY = (event.clientY - rect.top) / rect.height;

        const tiltX = (0.5 - relY) * MAX_TILT * 2;
        const tiltY = (relX - 0.5) * MAX_TILT * 2;

        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(() => {
          card.style.transform = `perspective(700px) rotateX(${tiltX.toFixed(
            2
          )}deg) rotateY(${tiltY.toFixed(2)}deg) translateZ(0)`;
        });
      };

      const reset = () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        card.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';
      };

      card.addEventListener('mousemove', onMove, { passive: true });
      card.addEventListener('mouseleave', reset);
    });
  }

  /* ------------------------------------------------------------------------
     15. Timeline animation (sequenced reveal)
     ------------------------------------------------------------------------ */

  function initTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (!timelineItems.length) return;

    if (prefersReducedMotion) {
      timelineItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const item = entry.target;
            const index = Array.prototype.indexOf.call(
              timelineItems,
              item
            );
            // Small stagger based on position for a cascading feel.
            window.setTimeout(() => {
              item.classList.add('is-visible');
            }, (index % 4) * 100);
            obs.unobserve(item);
          }
        });
      },
      { threshold: 0.3 }
    );

    timelineItems.forEach((item) => observer.observe(item));
    registerCleanup(() => observer.disconnect());
  }

  /* ------------------------------------------------------------------------
     16. Back-to-top button
     ------------------------------------------------------------------------ */

  function initBackToTop() {
    const button = document.querySelector('.back-to-top');
    if (!button) return;

    const SHOW_AFTER = 400;

    const toggleVisibility = () => {
      button.classList.toggle('visible', window.scrollY > SHOW_AFTER);
      button.classList.toggle('show', window.scrollY > SHOW_AFTER);
    };

    const onScroll = rafThrottle(toggleVisibility);
    window.addEventListener('scroll', onScroll, { passive: true });
    toggleVisibility();

    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    registerCleanup(() => window.removeEventListener('scroll', onScroll));
  }

  /* ------------------------------------------------------------------------
     17. Resize handling (debounced, recalculates layout-dependent bits)
     ------------------------------------------------------------------------ */

  function initResizeHandling() {
    const handleResize = debounce(() => {
      // Re-run any measurements that depend on viewport size. Individual
      // features already listen for resize where needed (progress bar,
      // FAQ heights); this hook exists for anything page-global.
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`
      );
    }, 150);

    window.addEventListener('resize', handleResize);
    handleResize();

    registerCleanup(() => {
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
    });
  }

  /* ------------------------------------------------------------------------
     Init: run everything once the DOM is ready
     ------------------------------------------------------------------------ */

  function init() {
    initLoader();
    initNavbarScrollState();
    initScrollProgressBar();
    initSmoothScroll();
    initScrollSpy();
    initRevealAnimations();
    initCounters();
    initFaqAccordion();
    initRippleEffect();
    initFloatingParticles();
    initAuroraAnimation();
    initMouseParallax();
    initHeroFloatingCardsDrift();
    initTechCardTilt();
    initTimelineAnimation();
    initBackToTop();
    initResizeHandling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
