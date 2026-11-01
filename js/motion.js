(function () {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initHeroParallax = () => {
    const hero = document.querySelector('.home-hero');
    const frames = Array.from(document.querySelectorAll('.hero-frame'));
    if (!hero || !frames.length) return;

    let ticking = false;

    const update = () => {
      const isDesktop = window.matchMedia('(min-width: 969px)').matches;

      if (prefersReducedMotion.matches || !isDesktop) {
        frames.forEach(frame => frame.style.removeProperty('--parallax-y'));
        ticking = false;
        return;
      }

      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        ticking = false;
        return;
      }

      const progress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1);
      const depths = [24, 40, 52];

      frames.forEach((frame, index) => {
        frame.style.setProperty('--parallax-y', `${progress * (depths[index] || 80)}px`);
      });

      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  };

  const revealAll = () => {
    document.querySelectorAll('[data-reveal]').forEach(element => {
      element.classList.add('is-visible');
    });
  };

  const applyStagger = scope => {
    scope.querySelectorAll('[data-reveal-group]').forEach(group => {
      const items = Array.from(group.children).filter(element =>
        element.hasAttribute('data-reveal')
      );

      items.forEach((item, index) => {
        const delay = Math.min(index, 5) * 80;
        item.style.setProperty('--reveal-delay', `${delay}ms`);
      });
    });
  };

  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    revealAll();
    window.CrystallineMotion = { refresh: revealAll };
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.01,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  const refresh = scope => {
    const container = scope || document;
    applyStagger(container);
    container
      .querySelectorAll('[data-reveal]:not(.is-visible)')
      .forEach(element => observer.observe(element));
  };

  root.classList.add('motion-ready');
  initHeroParallax();
  refresh();
  window.CrystallineMotion = { refresh };

  const handleReducedMotionChange = event => {
    if (event.matches) revealAll();
  };

  if (prefersReducedMotion.addEventListener) {
    prefersReducedMotion.addEventListener('change', handleReducedMotionChange);
  } else if (prefersReducedMotion.addListener) {
    prefersReducedMotion.addListener(handleReducedMotionChange);
  }
})();
