import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'raw'})

const updates = {
  'project-legacy-4': {
    title: '2 Units of 2-Bedroom Apartments',
    shortDescription: 'A residential scheme comprising two two-bedroom apartments.',
    description: 'A residential development comprising two two-bedroom apartments.',
    coverImageAlt: 'View of the 2 Units of 2-Bedroom Apartments',
    galleryAlt: 'Second view of the 2 Units of 2-Bedroom Apartments',
  },
  'project-legacy-3': {
    title: 'Five-Bedroom Duplex with Two-Bedroom Units',
    shortDescription:
      'A five-bedroom duplex with two-bedroom units, presented through two exterior renders.',
    description:
      'A five-bedroom duplex with two-bedroom units, documented through two exterior renders.',
    coverImageAlt: 'Exterior render of the Five-Bedroom Duplex with Two-Bedroom Units',
    galleryAlt:
      'Second exterior render of the Five-Bedroom Duplex with Two-Bedroom Units',
  },
}

const ids = Object.keys(updates)
const before = await client.fetch(
  `*[_id in $ids] | order(legacyId asc) {
    _id,
    _rev,
    legacyId,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    coverImage {alt, asset->{_id, url}},
    gallery[] {_key, alt, image {asset->{_id, url}}}
  }`,
  {ids},
)

if (before.length !== ids.length) {
  throw new Error(`Expected ${ids.length} documents, found ${before.length}`)
}
if (before.some((doc) => doc._id.startsWith('drafts.'))) {
  throw new Error('Refusing to patch while draft documents exist')
}

const results = []
for (const doc of before) {
  const update = updates[doc._id]
  if (!update) throw new Error(`Unexpected document ${doc._id}`)

  const galleryKey = doc.gallery?.[0]?._key
  const galleryPath = galleryKey
    ? `gallery[_key=="${galleryKey}"].alt`
    : 'gallery[0].alt'

  const patch = {
    title: update.title,
    shortDescription: update.shortDescription,
    description: update.description,
    'coverImage.alt': update.coverImageAlt,
    [galleryPath]: update.galleryAlt,
  }

  const updated = await client.patch(doc._id).set(patch).commit({returnDocuments: true})
  results.push({id: doc._id, patch, updated})
}

const after = await client.fetch(
  `*[_id in $ids] | order(legacyId asc) {
    _id,
    _rev,
    legacyId,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    seoTitle,
    seoDescription,
    order,
    featured,
    "categories": categories[]->{_id, title},
    coverImage {alt, asset->{_id, url}},
    gallery[] {_key, alt, image {asset->{_id, url}}}
  }`,
  {ids},
)

console.log(JSON.stringify({before, results, after}, null, 2))
