import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'raw'})

const expectedLegacy = {
  1: 'Three-Bedroom Duplex',
  2: 'Hotel',
  3: 'Five-Bedroom Duplex with Two-Bedroom Units',
  4: '2 Units of 2-Bedroom Apartments',
  5: 'Mixed-Use Development',
}

const projectFields = `{
  _id,
  _rev,
  _createdAt,
  _updatedAt,
  legacyId,
  title,
  "slug": slug.current,
  categories[]->{_id, _type, title, "slug": slug.current},
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
    _type,
    alt,
    hotspot,
    crop,
    asset->{_id, _type, url, originalFilename, metadata{dimensions{width, height, aspectRatio}}}
  },
  gallery[] {
    _key,
    _type,
    alt,
    caption,
    image {
      _type,
      hotspot,
      crop,
      asset->{_id, _type, url, originalFilename, metadata{dimensions{width, height, aspectRatio}}}
    }
  },
  seoTitle,
  seoDescription
}`

const projects = await client.fetch(
  `*[_type == "project"] | order(legacyId asc) ${projectFields}`,
)
const categories = await client.fetch(
  `*[_type == "category"] | order(order asc) {_id, _type, title, "slug": slug.current, order}`,
)

const categoryIds = new Set(categories.map((category) => category._id))
const seenSlugs = new Map()
const seenLegacy = new Map()
const failures = []
const warnings = []
const imageChecks = []

const imageUrlChecks = new Map()

async function checkImage(asset, label) {
  if (!asset) {
    failures.push(`${label}: missing asset reference`)
    return null
  }

  if (imageUrlChecks.has(asset._id)) return imageUrlChecks.get(asset._id)

  if (!asset.url) {
    failures.push(`${label}: asset ${asset._id} has no URL`)
    return null
  }

  let result
  try {
    const response = await fetch(asset.url, {method: 'HEAD'})
    result = {
      assetId: asset._id,
      status: response.status,
      contentType: response.headers.get('content-type'),
      url: asset.url,
    }
    if (!response.ok) failures.push(`${label}: asset ${asset._id} returned ${response.status}`)
  } catch (error) {
    result = {assetId: asset._id, status: null, error: String(error), url: asset.url}
    failures.push(`${label}: asset ${asset._id} request failed: ${error}`)
  }

  imageUrlChecks.set(asset._id, result)
  imageChecks.push({label, ...result, dimensions: asset.metadata?.dimensions || null})
  return result
}

for (const project of projects) {
  const isDraft = project._id.startsWith('drafts.')
  const label = `${project._id} (${project.title})`

  if (!isDraft) failures.push(`${label}: expected a draft, found published document`)
  if (!project.legacyId || !expectedLegacy[project.legacyId]) {
    failures.push(`${label}: unexpected legacy ID ${project.legacyId}`)
  } else if (expectedLegacy[project.legacyId] !== project.title) {
    failures.push(
      `${label}: legacy ID ${project.legacyId} expected title "${expectedLegacy[project.legacyId]}"`,
    )
  }

  if (!project.slug) {
    failures.push(`${label}: missing slug`)
  } else if (seenSlugs.has(project.slug)) {
    failures.push(`${label}: duplicate slug with ${seenSlugs.get(project.slug)}`)
  } else {
    seenSlugs.set(project.slug, project._id)
  }

  if (project.legacyId != null) {
    if (seenLegacy.has(project.legacyId)) {
      failures.push(`${label}: duplicate legacy ID with ${seenLegacy.get(project.legacyId)}`)
    } else {
      seenLegacy.set(project.legacyId, project._id)
    }
  }

  if (!Array.isArray(project.categories) || !project.categories.length) {
    failures.push(`${label}: missing categories`)
  } else {
    for (const category of project.categories) {
      if (!category || !category._id) {
        failures.push(`${label}: unresolved category reference`)
        continue
      }
      if (category._id.startsWith('drafts.')) {
        failures.push(`${label}: category ${category._id} points to a draft`)
      }
      if (!categoryIds.has(category._id)) {
        failures.push(`${label}: category ${category._id} is not published/available`)
      }
    }
  }

  if (!project.coverImage) {
    failures.push(`${label}: missing cover image`)
  } else {
    await checkImage(project.coverImage.asset, `${label} cover`)
  }

  if (!Array.isArray(project.gallery)) {
    failures.push(`${label}: gallery is not an array`)
  } else {
    const keys = new Set()
    for (const [index, item] of project.gallery.entries()) {
      if (!item) {
        failures.push(`${label}: gallery[${index}] is empty`)
        continue
      }
      if (!item._key) failures.push(`${label}: gallery[${index}] missing _key`)
      else if (keys.has(item._key)) failures.push(`${label}: duplicate gallery _key ${item._key}`)
      else keys.add(item._key)
      if (!item.image) failures.push(`${label}: gallery[${index}] missing image`)
      else await checkImage(item.image.asset, `${label} gallery[${index}]`)
    }
  }

  if (project.legacyId === 3 && project.gallery?.length !== 1) {
    warnings.push(
      `${label}: expected 1 gallery image for the two available exterior renders, found ${project.gallery?.length ?? 0}`,
    )
  }
}

const audit = {
  counts: {
    totalProjects: projects.length,
    drafts: projects.filter((project) => project._id.startsWith('drafts.')).length,
    published: projects.filter((project) => !project._id.startsWith('drafts.')).length,
    categories: categories.length,
    publishedCategories: categories.filter((category) => !category._id.startsWith('drafts.'))
      .length,
  },
  projects: projects.map((project) => ({
    _id: project._id,
    _rev: project._rev,
    legacyId: project.legacyId,
    title: project.title,
    slug: project.slug,
    categories: project.categories?.map((category) => ({
      _id: category?._id,
      title: category?.title,
      slug: category?.slug,
    })),
    location: project.location,
    year: project.year,
    status: project.status,
    client: project.client,
    architect: project.architect,
    order: project.order,
    featured: project.featured,
    shortDescription: project.shortDescription,
    description: project.description,
    galleryNote: project.galleryNote || null,
    coverImage: project.coverImage
      ? {
          alt: project.coverImage.alt,
          assetId: project.coverImage.asset?._id,
          url: project.coverImage.asset?.url,
          dimensions: project.coverImage.asset?.metadata?.dimensions,
        }
      : null,
    gallery: (project.gallery || []).map((item) => ({
      _key: item._key,
      alt: item.alt,
      caption: item.caption || null,
      assetId: item.image?.asset?._id,
      url: item.image?.asset?.url,
      dimensions: item.image?.asset?.metadata?.dimensions,
    })),
    totalImages: (project.coverImage ? 1 : 0) + (project.gallery?.length || 0),
  })),
  categories,
  imageChecks,
  failures,
  warnings,
}

console.log(JSON.stringify(audit, null, 2))
process.exit(failures.length ? 1 : 0)
