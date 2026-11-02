function escapeHtmlProject(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function getProjectDisplayCategory(project) {
  return project.category || (project.categories || []).join(' / ') || 'Project';
}

function getProjectImages(project) {
  if (Array.isArray(project.images) && project.images.length) return project.images;
  if (Array.isArray(project.gallery) && project.gallery.length) return project.gallery;
  return [];
}

function getProjectImageDimensions(image) {
  if (typeof getContentImageDimensions === 'function') {
    return getContentImageDimensions(image);
  }

  return typeof projectImageDimensions !== 'undefined'
    ? projectImageDimensions[image]
    : null;
}

function getProjectGalleryItems(project) {
  if (Array.isArray(project.galleryImages) && project.galleryImages.length) {
    return project.galleryImages
      .filter(image => image && image.src)
      .map((image, index) => ({
        src: image.src,
        srcset: image.srcset || '',
        alt: image.alt || `${project.title} — view ${index + 1}`,
        width: image.width || null,
        height: image.height || null
      }));
  }

  return getProjectImages(project).map((src, index) => ({
    src,
    srcset: '',
    alt: `${project.title} — view ${index + 1}`,
    width: null,
    height: null
  }));
}

function renderProjectFacts(project) {
  const facts = [
    ['Category', getProjectDisplayCategory(project)],
    ['Location', project.location],
    ['Date', project.year],
    ['Status', project.status],
    ['Client', project.client],
    ['Architect', project.architect]
  ].filter(([, value]) => Boolean(value));

  if (!facts.length) return '';

  return `
    <dl class="project-facts">
      ${facts.map(([label, value]) => `
        <div class="project-fact">
          <dt>${escapeHtmlProject(label)}</dt>
          <dd>${escapeHtmlProject(value)}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function renderProjectGallery(project) {
  const images = getProjectGalleryItems(project);

  if (images.length) {
    return images.map((image, index) => {
      const dimensions = image.width && image.height
        ? { width: image.width, height: image.height }
        : getProjectImageDimensions(image.src);
      const sizeAttributes = dimensions
        ? ` width="${dimensions.width}" height="${dimensions.height}"`
        : '';
      const ratioStyle = dimensions
        ? ` style="--media-ratio: ${dimensions.width} / ${dimensions.height}"`
        : '';
      const srcset = image.srcset
        ? ` srcset="${escapeHtmlProject(image.srcset)}" sizes="(max-width: 900px) 100vw, 50vw"`
        : '';

      return `
        <figure class="project-gallery-item"${ratioStyle} data-reveal>
          <img src="${escapeHtmlProject(image.src)}" alt="${escapeHtmlProject(image.alt)}"${srcset}${sizeAttributes} loading="lazy" decoding="async">
        </figure>
      `;
    }).join('');
  }

  return `
    <div class="project-gallery-item project-gallery-item--placeholder" data-reveal>
      ${renderProjectPlaceholder(0)}
    </div>
  `;
}

function renderProjectHero(project, category) {
  const cover = typeof getProjectCover === 'function' ? getProjectCover(project) : null;
  const dimensions = cover ? getProjectImageDimensions(cover) : null;
  const sizeAttributes = dimensions
    ? ` width="${dimensions.width}" height="${dimensions.height}"`
    : '';
  const srcset = project.coverImageSrcset
    ? ` srcset="${escapeHtmlProject(project.coverImageSrcset)}" sizes="100vw"`
    : '';
  const media = cover
    ? `<img src="${escapeHtmlProject(cover)}" alt="${escapeHtmlProject(project.coverImageAlt || project.title)}"${srcset}${sizeAttributes} fetchpriority="high" decoding="async">`
    : renderProjectPlaceholder(0);
  const status = project.status ? ` / ${escapeHtmlProject(project.status)}` : '';

  return `
    <section class="project-detail-hero" aria-labelledby="project-title">
      <div class="project-detail-hero-media" aria-hidden="true">
        ${media}
      </div>
      <div class="container project-detail-header">
        <a href="projects.html" class="back-link"><span aria-hidden="true">&#8592;</span> All Projects</a>
        <div class="project-detail-heading" data-reveal-group>
          <p class="eyebrow" data-reveal>${escapeHtmlProject(category)}${status}</p>
          <h1 class="project-detail-title" id="project-title" data-reveal>${escapeHtmlProject(project.title)}</h1>
          <p class="project-detail-summary" data-reveal>${escapeHtmlProject(project.shortDescription || project.description)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderNextProject(project) {
  const ordered = typeof getOrderedProjects === 'function' ? getOrderedProjects() : projects;
  if (!ordered || ordered.length < 2) return '';

  const currentIndex = ordered.findIndex(item => item.id === project.id);
  const nextProject = ordered[(currentIndex + 1) % ordered.length];
  if (!nextProject || nextProject.id === project.id) return '';

  const meta = typeof formatProjectMeta === 'function'
    ? formatProjectMeta(nextProject)
    : getProjectDisplayCategory(nextProject);

  return `
    <section class="next-project" aria-label="Next project">
      <div class="container">
        <a href="project.html?id=${encodeURIComponent(nextProject.id)}" class="next-project-link" data-reveal>
          <div>
            <span class="eyebrow">Next Project</span>
            <span class="next-project-title">${escapeHtmlProject(nextProject.title)}</span>
            <span class="next-project-meta">${escapeHtmlProject(meta)}</span>
          </div>
          <span class="next-project-arrow" aria-hidden="true">&#8599;</span>
        </a>
      </div>
    </section>
  `;
}

function renderProjectError(container, title, text) {
  document.title = `${title} — Crystalline Architects`;
  container.innerHTML = `
    <section class="empty-state">
      <div class="container">
        <p class="eyebrow">Projects</p>
        <h1>${escapeHtmlProject(title)}</h1>
        <p>${escapeHtmlProject(text)}</p>
        <a href="projects.html" class="button button-solid">View All Projects</a>
      </div>
    </section>
  `;
}

async function renderProjectDetail() {
  const container = document.getElementById('projectDetail');
  if (!container) return;

  let projectList = [];

  if (typeof loadContent === 'function') {
    try {
      const content = await loadContent();
      projectList = content && Array.isArray(content.projects) ? content.projects : [];
    } catch (error) {
      console.warn('Project content could not be loaded. Using local fallback data.', error);
    }
  }

  if (!projectList.length && typeof projects !== 'undefined' && Array.isArray(projects)) {
    projectList = projects;
  }

  if (!projectList.length) {
    renderProjectError(container, 'Project data unavailable', 'Project information is not available at the moment.');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const identifier = urlParams.get('id') || urlParams.get('project');
  const project = projectList.find(item => String(item.id) === identifier || item.slug === identifier);

  if (!project) {
    renderProjectError(container, 'Project not found', 'The project you are looking for does not exist or is no longer available.');
    return;
  }

  const category = getProjectDisplayCategory(project);
  const images = getProjectImages(project);
  const galleryNoteText = project.galleryNote || (images.length
    ? ''
    : 'Project imagery will be published once the client confirms the correct images.');
  const galleryNote = galleryNoteText
    ? `<p class="project-gallery-note">${escapeHtmlProject(galleryNoteText)}</p>`
    : '';

  document.title = project.seoTitle || `${project.title} — Crystalline Architects`;

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute('content', project.seoDescription || project.shortDescription || project.description || 'Project by Crystalline Architects.');
  }

  container.innerHTML = `
    ${renderProjectHero(project, category)}

    <section class="project-facts-section" aria-label="Project details">
      <div class="container">
        <div data-reveal>
          ${renderProjectFacts(project)}
        </div>
      </div>
    </section>

    <section class="project-gallery-section" aria-label="Project gallery">
      <div class="container">
        <div class="project-gallery" data-reveal-group>
          ${renderProjectGallery(project)}
        </div>
        ${galleryNote}
      </div>
    </section>

    <section class="project-description-section" aria-labelledby="project-description-heading">
      <div class="container project-description-layout">
        <div class="project-description-label" data-reveal>
          <p class="eyebrow">Project</p>
        </div>
        <div class="project-description-copy" data-reveal>
          <h2 id="project-description-heading">About the project</h2>
          <p>${escapeHtmlProject(project.description || project.shortDescription)}</p>
        </div>
      </div>
    </section>

    ${renderNextProject(project)}
  `;

  if (window.CrystallineMotion) window.CrystallineMotion.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderProjectDetail);
} else {
  renderProjectDetail();
}
