import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'raw'})

const expected = {
  1: {id: 'project-legacy-1', title: 'Three-Bedroom Duplex', slug: 'three-bedroom-duplex-ibadan', images: 2},
  2: {id: 'project-legacy-2', title: 'Hotel', slug: 'hotel-ikorodu', images: 3},
  3: {id: 'project-legacy-3', title: 'Residential Building Design', slug: 'residential-project', images: 2},
  4: {
    id: 'project-legacy-4',
    title: 'Five-Bedroom Duplex with Two-Bedroom Units',
    slug: 'five-bedroom-duplex-two-bedroom-units',
    images: 2,
  },
  5: {id: 'project-legacy-5', title: 'Mixed-Use Development', slug: 'mixed-use-development-ikeja', images: 6},
}

const projects = await client.fetch(
  `*[_type == "project"] | order(legacyId asc) {
    _id,
    _rev,
    legacyId,
    title,
    "slug": slug.current,
    "categoryIds": categories[]->_id,
    shortDescription,
    description,
    coverImage {asset->{_id, url}},
    gallery[] {image {asset->{_id, url}}}
  }`,
)
const categories = await client.fetch(
  `*[_type == "category"] | order(order asc) {_id, title, "slug": slug.current}`,
)

const failures = []
const warnings = []
const categoryIds = new Set(categories.map((category) => category._id))

if (projects.length !== 5) failures.push(`Expected 5 projects, found ${projects.length}`)
if (categories.length !== 4) failures.push(`Expected 4 categories, found ${categories.length}`)

for (const project of projects) {
  const wanted = expected[project.legacyId]
  const label = `${project._id} (${project.title})`

  if (!wanted) {
    failures.push(`${label}: unexpected legacy ID ${project.legacyId}`)
    continue
  }
  if (project._id !== wanted.id) failures.push(`${label}: expected id ${wanted.id}`)
  if (project._id.startsWith('drafts.')) failures.push(`${label}: still a draft`)
  if (project.title !== wanted.title) failures.push(`${label}: expected title "${wanted.title}"`)
  if (project.slug !== wanted.slug) failures.push(`${label}: expected slug "${wanted.slug}"`)

  const totalImages = (project.coverImage ? 1 : 0) + (project.gallery?.length || 0)
  if (totalImages !== wanted.images) {
    failures.push(`${label}: expected ${wanted.images} images, found ${totalImages}`)
  }
  if (!project.coverImage?.asset?.url) failures.push(`${label}: missing cover image asset URL`)
  for (const [index, item] of (project.gallery || []).entries()) {
    if (!item?.image?.asset?.url) failures.push(`${label}: gallery[${index}] missing asset URL`)
  }
  if (!project.categoryIds?.length) {
    failures.push(`${label}: missing categories`)
  } else {
    for (const categoryId of project.categoryIds) {
      if (!categoryIds.has(categoryId)) failures.push(`${label}: invalid category ${categoryId}`)
    }
  }
}

if (projects.some((project) => project._id.startsWith('drafts.'))) {
  failures.push('Draft project documents still exist')
}
if (categories.some((category) => category._id.startsWith('drafts.'))) {
  failures.push('Draft category documents exist')
}

const residential = projects.find((project) => project.legacyId === 3)
if (!residential) {
  failures.push('Residential Building Design project not found')
} else {
  if (residential.shortDescription !== 'A residential building design presented through two exterior renders.') {
    failures.push(`Residential shortDescription mismatch: ${residential.shortDescription}`)
  }
  if (residential.description !== 'A residential building design documented through two exterior renders.') {
    failures.push(`Residential description mismatch: ${residential.description}`)
  }
  const unsupported = /floor plan|interior stud|moodboard|material board/i
  if (unsupported.test(`${residential.shortDescription} ${residential.description}`)) {
    failures.push('Residential description still references unsupported image types')
  }
}

const imageUrls = projects.flatMap((project) => [
  project.coverImage?.asset?.url,
  ...(project.gallery || []).map((item) => item.image?.asset?.url),
]).filter(Boolean)

const uniqueImageUrls = [...new Set(imageUrls)]
for (const url of uniqueImageUrls) {
  const response = await fetch(url, {method: 'HEAD'})
  if (!response.ok) failures.push(`Image URL returned ${response.status}: ${url}`)
}

console.log(
  JSON.stringify(
    {
      counts: {
        projects: projects.length,
        publishedProjects: projects.filter((project) => !project._id.startsWith('drafts.')).length,
        draftProjects: projects.filter((project) => project._id.startsWith('drafts.')).length,
        categories: categories.length,
        publishedCategories: categories.filter((category) => !category._id.startsWith('drafts.')).length,
        uniqueImagesChecked: uniqueImageUrls.length,
      },
      projects: projects.map((project) => ({
        id: project._id,
        legacyId: project.legacyId,
        title: project.title,
        slug: project.slug,
        categories: project.categoryIds,
        shortDescription: project.shortDescription,
        description: project.description,
        images: (project.coverImage ? 1 : 0) + (project.gallery?.length || 0),
      })),
      categories,
      failures,
      warnings,
    },
    null,
    2,
  ),
)

process.exit(failures.length ? 1 : 0)
