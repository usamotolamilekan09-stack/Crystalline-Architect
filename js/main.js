let activeProjects = [];
let activeCategories = [];
let activeDimensions = {};
let contentPromise = null;

function getLocalProjects() {
  return typeof projects !== 'undefined' && Array.isArray(projects) ? projects : [];
}

function getLocalDimensions() {
  return typeof projectImageDimensions !== 'undefined' ? projectImageDimensions : {};
}

function getOrderedProjects() {
  const source = activeProjects.length ? activeProjects : getLocalProjects();
  return [...source].sort((a, b) => (a.order || 99) - (b.order || 99));
}

function setActiveContent(result) {
  activeProjects = result && Array.isArray(result.projects) ? result.projects : [];
  activeCategories = result && Array.isArray(result.categories) ? result.categories : [];
  activeDimensions = {
    ...getLocalDimensions(),
    ...(result && result.dimensions ? result.dimensions : {})
  };
}

function loadContent() {
  if (contentPromise) return contentPromise;

  contentPromise = (async () => {
    if (window.CrystallineContent && typeof window.CrystallineContent.load === 'function') {
      try {
        const result = await window.CrystallineContent.load();
        setActiveContent(result);
        return result;
      } catch (error) {
        console.warn('Sanity content could not be loaded. Using local fallback data.', error);
      }
    }

    const fallback = {
      projects: getLocalProjects(),
      categories: [],
      dimensions: getLocalDimensions(),
      source: 'fallback'
    };
    setActiveContent(fallback);
    return fallback;
  })();

  return contentPromise;
}

function getContentImageDimensions(image) {
  return activeDimensions[image] || getLocalDimensions()[image] || null;
}

function padProjectIndex(index) {
  return String(index + 1).padStart(2, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function getProjectCover(project) {
  if (project.coverImage) return project.coverImage;
  if (Array.isArray(project.images) && project.images.length) return project.images[0];
  return null;
}

function renderProjectPlaceholder(index) {
  return `
    <div class="media-placeholder" aria-hidden="true">
      <span class="media-placeholder-index">${padProjectIndex(index)}</span>
      <div class="media-placeholder-label">
        <span class="media-placeholder-kicker">Project photography</span>
        <span>Pending confirmation</span>
      </div>
    </div>
  `;
}

function renderProjectMedia(project, index, options = {}) {
  const cover = getProjectCover(project);
  const status = project.status
    ? `<span class="project-status">${escapeHtml(project.status)}</span>`
    : '';
  const loading = options.eager ? 'eager' : 'lazy';
  const priority = options.eager ? ' fetchpriority="high"' : '';
  const dimensions = getContentImageDimensions(cover);
  const sizeAttributes = dimensions
    ? ` width="${dimensions.width}" height="${dimensions.height}"`
    : '';
  const ratioStyle = dimensions
    ? ` style="--media-ratio: ${dimensions.width} / ${dimensions.height}"`
    : '';
  const sizes = options.sizes || '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw';
  const srcset = project.coverImageSrcset
    ? ` srcset="${escapeHtml(project.coverImageSrcset)}" sizes="${escapeHtml(sizes)}"`
    : '';

  const media = cover
    ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(project.coverImageAlt || project.title)}"${srcset}${sizeAttributes} loading="${loading}"${priority} decoding="async">`
    : renderProjectPlaceholder(index);

  const view = cover
    ? '<span class="project-view">View project <span aria-hidden="true">&#8599;</span></span>'
    : '';

  return `<div class="project-media"${ratioStyle}>${media}${status}${view}</div>`;
}

function formatProjectMeta(project) {
  const category = project.category || (project.categories || []).join(' / ');
  const meta = [category, project.location, project.year].filter(Boolean).join(' · ');
  return meta || 'Details to be confirmed';
}

function getProjectCardVariant(index) {
  if (index === 0) return 'feature';
  return index % 2 === 1 ? 'offset-a' : 'offset-b';
}

function projectCardMarkup(project, index, options = {}) {
  const title = escapeHtml(project.title);
  const meta = escapeHtml(formatProjectMeta(project));
  const variant = options.variant || getProjectCardVariant(index);
  const variantClass = variant ? ` project-card--${variant}` : '';
  const revealAttribute = options.reveal === false ? '' : ' data-reveal';

  return `
    <a href="project.html?id=${encodeURIComponent(project.id)}" class="project-card${variantClass}"${revealAttribute} aria-label="View project: ${title}">
      <span class="project-number" aria-hidden="true">${padProjectIndex(index)}</span>
      ${renderProjectMedia(project, index, { eager: options.eager !== undefined ? options.eager : index === 0, sizes: options.sizes })}
      <div class="project-info">
        <div>
          <p class="project-index">Project ${padProjectIndex(index)}</p>
          <h3 class="project-title">${title}</h3>
          <p class="project-meta">${meta}</p>
        </div>
        <span class="project-arrow" aria-hidden="true">&#8599;</span>
      </div>
    </a>
  `;
}

function refreshMotion() {
  if (window.CrystallineMotion) window.CrystallineMotion.refresh();
}

function renderFeaturedProjects() {
  const container = document.getElementById('featuredProjects');
  if (!container) return;

  const ordered = getOrderedProjects();

  if (!ordered.length) {
    container.innerHTML = '<p class="project-grid-message">Projects will be published here.</p>';
    document.querySelectorAll('[data-project-prev], [data-project-next]').forEach(button => {
      button.disabled = true;
    });
    const status = document.getElementById('projectRailStatus');
    if (status) status.textContent = '00 / 00';
    return;
  }

  container.innerHTML = ordered
    .map((project, index) => projectCardMarkup(project, index, {
      variant: 'slide',
      reveal: false,
      sizes: '(max-width: 780px) 78vw, (max-width: 1100px) 75vw, 68rem'
    }))
    .join('');

  initProjectRail();
  refreshMotion();
}

function initProjectRail() {
  const rail = document.getElementById('featuredProjects');
  if (!rail) return;

  const slides = Array.from(rail.querySelectorAll('.project-card--slide'));
  const prevButton = document.querySelector('[data-project-prev]');
  const nextButton = document.querySelector('[data-project-next]');
  const status = document.getElementById('projectRailStatus');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!slides.length) return;

  let targetIndex = null;
  let settleTimer = null;

  const getActiveIndex = () => {
    const railLeft = rail.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Infinity;

    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - railLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const updateControls = (index) => {
    const activeIndex = index === undefined ? getActiveIndex() : index;

    if (prevButton) prevButton.disabled = activeIndex <= 0;
    if (nextButton) nextButton.disabled = activeIndex >= slides.length - 1;
    if (status) {
      status.textContent = `${padProjectIndex(activeIndex)} / ${String(slides.length).padStart(2, '0')}`;
    }
  };

  const scrollToIndex = (index) => {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    const slide = slides[nextIndex];
    const offset = slide.getBoundingClientRect().left - rail.getBoundingClientRect().left;

    targetIndex = nextIndex;
    updateControls(nextIndex);

    rail.scrollTo({
      left: rail.scrollLeft + offset,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
    });

    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      targetIndex = null;
      updateControls(getActiveIndex());
    }, 700);
  };

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      const index = targetIndex === null ? getActiveIndex() : targetIndex;
      scrollToIndex(index - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const index = targetIndex === null ? getActiveIndex() : targetIndex;
      scrollToIndex(index + 1);
    });
  }

  rail.addEventListener('scroll', () => {
    if (targetIndex !== null) return;

    window.requestAnimationFrame(() => {
      updateControls(getActiveIndex());
    });
  }, { passive: true });

  rail.addEventListener('keydown', event => {
    const index = targetIndex === null ? getActiveIndex() : targetIndex;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollToIndex(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollToIndex(index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollToIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToIndex(slides.length - 1);
    }
  });

  window.addEventListener('resize', () => {
    targetIndex = null;
    updateControls(getActiveIndex());
  }, { passive: true });

  updateControls(0);
}

function renderAllProjects(filterCategory = 'all') {
  const container = document.getElementById('projectsGrid');
  if (!container) return;

  const ordered = getOrderedProjects();
  const filtered = filterCategory === 'all'
    ? ordered
    : ordered.filter(project => {
        const categories = project.categories || [project.category].filter(Boolean);
        return categories.includes(filterCategory);
      });

  const count = document.getElementById('projectCount');
  if (count) {
    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'Project' : 'Projects'}`;
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="project-grid-message">No projects found in this category.</p>';
    refreshMotion();
    return;
  }

  container.innerHTML = filtered
    .map((project, index) => projectCardMarkup(project, index))
    .join('');

  refreshMotion();
}

function renderProjectFilters(categories) {
  const container = document.querySelector('.filters');
  if (!container || !categories.length) return;

  const seen = new Set();
  const items = [{ title: 'All', value: 'all' }];

  categories.forEach(category => {
    const title = category && category.title;
    if (!title || seen.has(title)) return;
    seen.add(title);
    items.push({ title, value: title });
  });

  container.innerHTML = items
    .map((item, index) => `
      <button type="button" class="filter-btn${index === 0 ? ' active' : ''}" data-filter="${escapeHtml(item.value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${escapeHtml(item.title)}</button>
    `)
    .join('');
}

function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterButtons.length) return;

  const updatePressedState = () => {
    filterButtons.forEach(button => {
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    });
  };

  updatePressedState();

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      updatePressedState();
      renderAllProjects(button.getAttribute('data-filter') || 'all');
    });
  });
}

function initMobileNav() {
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (!nav || !navToggle || !navMenu) return;

  const root = document.documentElement;
  const mobileQuery = window.matchMedia('(max-width: 968px)');
  let isOpen = false;

  const getFocusable = () => [
    navToggle,
    ...navMenu.querySelectorAll('a[href], button:not([disabled])')
  ];

  const setOpen = (open, returnFocus = false) => {
    if (open && !mobileQuery.matches) return;
    isOpen = open;

    navMenu.classList.toggle('active', open);
    nav.classList.toggle('nav-menu-open', open);
    document.body.classList.toggle('nav-open', open);
    root.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');

    if (open) {
      window.requestAnimationFrame(() => {
        const firstLink = navMenu.querySelector('.nav-link');
        if (firstLink) firstLink.focus();
      });
    } else if (returnFocus) {
      navToggle.focus();
    }
  };

  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation menu');

  navToggle.addEventListener('click', () => {
    setOpen(!isOpen);
  });

  navMenu.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', event => {
    if (isOpen && !nav.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusable().filter(element => element.offsetWidth > 0 || element.offsetHeight > 0);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const closeOnDesktop = () => {
    if (!mobileQuery.matches) setOpen(false);
  };

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', closeOnDesktop);
  } else {
    window.addEventListener('resize', closeOnDesktop);
  }

  window.addEventListener('resize', closeOnDesktop);
}

function setActiveNavLink() {
  const pageMap = { 'project.html': 'projects.html' };
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const targetPage = pageMap[currentPage] || currentPage;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href').split('?')[0];
    const isActive = linkPage === targetPage;
    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const update = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
}

async function init() {
  initMobileNav();
  initNavScroll();
  setActiveNavLink();

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'index.html' || currentPage === '') {
    await loadContent();
    renderFeaturedProjects();
  } else if (currentPage === 'projects.html') {
    await loadContent();
    renderProjectFilters(activeCategories);
    renderAllProjects('all');
    initProjectFilters();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
