function getOrderedProjects() {
  if (typeof projects === 'undefined' || !Array.isArray(projects)) return [];
  return [...projects].sort((a, b) => (a.order || 99) - (b.order || 99));
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
  const dimensions = typeof projectImageDimensions !== 'undefined'
    ? projectImageDimensions[cover]
    : null;
  const sizeAttributes = dimensions
    ? ` width="${dimensions.width}" height="${dimensions.height}"`
    : '';
  const ratioStyle = dimensions
    ? ` style="--media-ratio: ${dimensions.width} / ${dimensions.height}"`
    : '';

  const media = cover
    ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(project.coverImageAlt || project.title)}"${sizeAttributes} loading="${loading}"${priority} decoding="async">`
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

  return `
    <a href="project.html?id=${encodeURIComponent(project.id)}" class="project-card${variantClass}" data-reveal aria-label="View project: ${title}">
      <span class="project-number" aria-hidden="true">${padProjectIndex(index)}</span>
      ${renderProjectMedia(project, index, { eager: index === 0 })}
      <div class="project-info">
        <div>
          <p class="project-index">${padProjectIndex(index)} / Selected Work</p>
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
  const featured = ordered.filter(project => project.featured).slice(0, 3);
  const selection = featured.length ? featured : ordered.slice(0, 3);

  if (!selection.length) {
    container.innerHTML = '<p class="project-grid-message">Projects will be published here.</p>';
    return;
  }

  container.innerHTML = selection
    .map((project, index) => projectCardMarkup(project, index))
    .join('');

  refreshMotion();
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

function init() {
  initMobileNav();
  initNavScroll();
  setActiveNavLink();

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'index.html' || currentPage === '') {
    renderFeaturedProjects();
  } else if (currentPage === 'projects.html') {
    renderAllProjects('all');
    initProjectFilters();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
