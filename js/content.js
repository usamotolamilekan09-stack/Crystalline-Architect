(function () {
  'use strict';

  const config = window.CrystallineSanityConfig || {};
  const projectId = typeof config.projectId === 'string' ? config.projectId.trim() : '';
  const dataset = config.dataset || 'production';
  const apiVersion = config.apiVersion || '2025-02-19';
  const useCdn = config.useCdn !== false;
  const imageWidths = [480, 800, 1200, 1600];
  const fallbackCategoryOrder = ['Residential', 'Hospitality', 'Mixed-Use', 'Multi-Unit'];

  const projectsQuery = `*[_type == "project"] | order(order asc) {
    _id,
    legacyId,
    "slug": slug.current,
    title,
    "categories": categories[]->{title, "slug": slug.current},
    location,
    year,
    status,
    client,
    architect,
    order,
    featured,
    shortDescription,
    description,
    galleryNote,
    coverImage {
      alt,
      asset->{url, metadata{dimensions{width, height, aspectRatio}}}
    },
    gallery[] {
      alt,
      caption,
      image {
        asset->{url, metadata{dimensions{width, height, aspectRatio}}}
      }
    },
    seoTitle,
    seoDescription
  }`;

  const categoriesQuery = `*[_type == "category"] | order(order asc) {
    title,
    "slug": slug.current,
    order
  }`;

  let loadPromise = null;
  let currentSource = 'fallback';

  function slugifyCategory(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function isConfigured() {
    return Boolean(
      config.enabled &&
        projectId &&
        projectId !== 'project-id-not-configured' &&
        !projectId.includes('YOUR_')
    );
  }

  function getAsset(image) {
    return image && image.asset ? image.asset : null;
  }

  function getDimensions(image) {
    const dimensions = image?.asset?.metadata?.dimensions;
    if (!dimensions || !dimensions.width || !dimensions.height) return null;

    return {
      width: dimensions.width,
      height: dimensions.height
    };
  }

  function buildImageUrl(image, width) {
    const asset = getAsset(image);
    if (!asset || !asset.url) return null;

    const separator = asset.url.includes('?') ? '&' : '?';
    const widthParam = width ? `&w=${width}` : '';

    return `${asset.url}${separator}auto=format&fit=max${widthParam}&q=75`;
  }

  function buildSrcSet(image) {
    return imageWidths
      .map((width) => {
        const url = buildImageUrl(image, width);
        return url ? `${url} ${width}w` : null;
      })
      .filter(Boolean)
      .join(', ');
  }

  function normalizeGallery(document) {
    const gallery = Array.isArray(document.gallery) ? document.gallery : [];

    return gallery
      .map((item, index) => {
        const image = item && item.image;
        const src = buildImageUrl(image, 1600);
        if (!src) return null;

        const dimensions = getDimensions(image);

        return {
          src,
          srcset: buildSrcSet(image),
          alt: item.alt || `${document.title || 'Project'} — view ${index + 1}`,
          caption: item.caption || '',
          width: dimensions?.width || null,
          height: dimensions?.height || null,
          ratio: dimensions ? `${dimensions.width} / ${dimensions.height}` : null
        };
      })
      .filter(Boolean);
  }

  function normalizeProject(document) {
    const categories = Array.isArray(document.categories) ? document.categories.filter(Boolean) : [];
    const categoryTitles = categories
      .map((category) => (typeof category === 'string' ? category : category.title))
      .filter(Boolean);
    const categorySlugs = categories
      .map((category) =>
        typeof category === 'string' ? slugifyCategory(category) : category.slug
      )
      .filter(Boolean);
    const coverDimensions = getDimensions(document.coverImage);
    const galleryImages = normalizeGallery(document);

    return {
      id: document.legacyId ?? document._id ?? document.slug,
      _id: document._id,
      legacyId: document.legacyId ?? null,
      slug: document.slug,
      title: document.title || '',
      categories: categoryTitles,
      categorySlugs,
      category: categoryTitles.join(' / '),
      location: document.location || '',
      year: document.year || '',
      status: document.status || '',
      client: document.client || '',
      architect: document.architect || 'Crystalline Architects',
      order: typeof document.order === 'number' ? document.order : 99,
      featured: Boolean(document.featured),
      shortDescription: document.shortDescription || '',
      description: document.description || document.shortDescription || '',
      galleryNote: document.galleryNote || '',
      coverImage: buildImageUrl(document.coverImage, 1600),
      coverImageAlt: document.coverImage?.alt || document.title || '',
      coverImageSrcset: buildSrcSet(document.coverImage),
      coverImageWidth: coverDimensions?.width || null,
      coverImageHeight: coverDimensions?.height || null,
      images: galleryImages.map((image) => image.src),
      galleryImages,
      expectedImageCount: galleryImages.length,
      seoTitle: document.seoTitle || '',
      seoDescription: document.seoDescription || ''
    };
  }

  function buildDimensions(projects) {
    return projects.reduce((dimensions, project) => {
      if (project.coverImage && project.coverImageWidth && project.coverImageHeight) {
        dimensions[project.coverImage] = {
          width: project.coverImageWidth,
          height: project.coverImageHeight
        };
      }

      (project.galleryImages || []).forEach((image) => {
        if (image.src && image.width && image.height) {
          dimensions[image.src] = {
            width: image.width,
            height: image.height
          };
        }
      });

      return dimensions;
    }, {});
  }

  function deriveCategories(projects) {
    const seen = new Set();
    const categories = projects.reduce((items, project) => {
      (project.categories || []).forEach((title) => {
        if (!title || seen.has(title)) return;
        seen.add(title);
        items.push({
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          order: 0
        });
      });

      return items;
    }, []);

    categories.sort((a, b) => {
      const aIndex = fallbackCategoryOrder.indexOf(a.title);
      const bIndex = fallbackCategoryOrder.indexOf(b.title);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return categories.map((category, index) => ({
      ...category,
      order: index + 1
    }));
  }

  function getFallbackProjects() {
    if (typeof projects === 'undefined' || !Array.isArray(projects)) return [];

    return projects.map((project) => ({
      ...project,
      categories: Array.isArray(project.categories) ? [...project.categories] : [],
      images: Array.isArray(project.images) ? [...project.images] : []
    }));
  }

  function buildResult(projectList, categoryList, source) {
    const localDimensions = typeof projectImageDimensions !== 'undefined' ? projectImageDimensions : {};

    return {
      projects: projectList,
      categories: categoryList && categoryList.length ? categoryList : deriveCategories(projectList),
      dimensions: {
        ...localDimensions,
        ...buildDimensions(projectList)
      },
      source
    };
  }

  function buildQueryUrl(query) {
    const host = useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
    const endpoint = `https://${projectId}.${host}/v${apiVersion}/data/query/${dataset}`;
    return `${endpoint}?query=${encodeURIComponent(query)}&perspective=published`;
  }

  async function fetchQuery(query) {
    const response = await fetch(buildQueryUrl(query), {
      credentials: 'omit',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Sanity request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    return Array.isArray(payload.result) ? payload.result : [];
  }

  async function fetchContent() {
    const [projectDocuments, categoryDocuments] = await Promise.all([
      fetchQuery(projectsQuery),
      fetchQuery(categoriesQuery)
    ]);

    return buildResult(
      projectDocuments.map(normalizeProject),
      categoryDocuments,
      'sanity'
    );
  }

  function load() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const fallbackProjects = getFallbackProjects();
      const fallbackResult = buildResult(fallbackProjects, [], 'fallback');

      if (!isConfigured()) {
        currentSource = 'fallback';
        return fallbackResult;
      }

      try {
        const result = await fetchContent();
        if (result.projects.length) {
          currentSource = 'sanity';
          return result;
        }
      } catch (error) {
        console.warn('Sanity content is unavailable. Using local fallback data.', error);
      }

      currentSource = 'fallback';
      return fallbackResult;
    })();

    return loadPromise;
  }

  window.CrystallineContent = {
    load,
    isConfigured,
    normalizeProject,
    getImageUrl: buildImageUrl,
    buildSrcSet,
    getSource: () => currentSource,
    projectsQuery,
    categoriesQuery
  };
})();
