import {createClient} from '@sanity/client'
import {createReadStream} from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const projectId = 'w89s00vy'
const dataset = 'production'
const apiVersion = '2025-02-19'

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const imagesDir = path.join(root, 'images', 'projects')

const imageFiles = [
  {file: 'mixed-use-development-ikeja-01.jpg'},
  {file: 'mixed-use-development-ikeja-02.jpg'},
  {file: 'mixed-use-development-ikeja-03.jpg'},
  {file: 'mixed-use-development-ikeja-04.jpg'},
  {file: 'mixed-use-development-ikeja-05.jpg'},
  {file: 'mixed-use-development-ikeja-06.jpg'},
  {file: 'three-bedroom-duplex-ibadan-01.jpg'},
  {file: 'three-bedroom-duplex-ibadan-02.jpg'},
  {file: 'hotel-ikorodu-01.jpg'},
  {file: 'hotel-ikorodu-02.jpg'},
  {file: 'hotel-ikorodu-03.jpg'},
  {file: 'residential-project-01.jpg'},
  {file: 'residential-project-02.jpg'},
  {file: 'five-bedroom-duplex-two-bedroom-units-01.jpg'},
  {file: 'five-bedroom-duplex-two-bedroom-units-02.jpg'},
]

const categories = [
  {title: 'Residential', slug: 'residential', order: 1},
  {title: 'Hospitality', slug: 'hospitality', order: 2},
  {title: 'Mixed-Use', slug: 'mixed-use', order: 3},
  {title: 'Multi-Unit', slug: 'multi-unit', order: 4},
]

const projects = [
  {
    title: 'Mixed-Use Development',
    slug: 'mixed-use-development-ikeja',
    legacyId: 5,
    categories: ['Mixed-Use'],
    location: 'Ikeja LGA, Lagos',
    year: 'July 2026',
    status: 'Proposed',
    client: 'Murphy Ben International Ltd.',
    architect: 'Crystalline Architects',
    order: 1,
    featured: true,
    shortDescription: 'A proposed mixed-use development in Ikeja LGA, Lagos, for Murphy Ben International Ltd.',
    description: 'A proposed mixed-use development in Ikeja LGA, Lagos, prepared for Murphy Ben International Ltd. in July 2026. The proposal is documented through six exterior views.',
    imageFiles: ['mixed-use-development-ikeja-01.jpg','mixed-use-development-ikeja-02.jpg','mixed-use-development-ikeja-03.jpg','mixed-use-development-ikeja-04.jpg','mixed-use-development-ikeja-05.jpg','mixed-use-development-ikeja-06.jpg'],
  },
  {
    title: 'Three-Bedroom Duplex',
    slug: 'three-bedroom-duplex-ibadan',
    legacyId: 1,
    categories: ['Residential'],
    location: 'Ibadan',
    year: '',
    status: '',
    client: '',
    architect: 'Crystalline Architects',
    order: 3,
    featured: true,
    shortDescription: 'A three-bedroom residential duplex in Ibadan.',
    description: 'A three-bedroom residential duplex located in Ibadan.',
    imageFiles: ['three-bedroom-duplex-ibadan-01.jpg','three-bedroom-duplex-ibadan-02.jpg'],
  },
  {
    title: 'Hotel',
    slug: 'hotel-ikorodu',
    legacyId: 2,
    categories: ['Hospitality'],
    location: 'Ikorodu, Lagos',
    year: '2026',
    status: 'Under Construction',
    client: '',
    architect: 'Crystalline Architects',
    order: 2,
    featured: true,
    shortDescription: 'A hotel project in Ikorodu, Lagos, currently under construction.',
    description: 'A hospitality project in Ikorodu, Lagos, designed by Crystalline Architects and currently under construction.',
    imageFiles: ['hotel-ikorodu-01.jpg','hotel-ikorodu-02.jpg','hotel-ikorodu-03.jpg'],
  },
  {
    title: 'Five-Bedroom Duplex with Two-Bedroom Units',
    slug: 'residential-project',
    legacyId: 3,
    categories: ['Residential'],
    location: '',
    year: '',
    status: '',
    client: '',
    architect: 'Crystalline Architects',
    order: 5,
    featured: false,
    shortDescription: 'A five-bedroom duplex with two-bedroom units, presented through two exterior renders.',
    description: 'A five-bedroom duplex with two-bedroom units, documented through two exterior renders.',
    imageFiles: ['residential-project-01.jpg','residential-project-02.jpg'],
  },
  {
    title: '2 Units of 2-Bedroom Apartments',
    slug: 'five-bedroom-duplex-two-bedroom-units',
    legacyId: 4,
    categories: ['Residential','Multi-Unit'],
    location: '',
    year: '',
    status: '',
    client: '',
    architect: 'Crystalline Architects',
    order: 4,
    featured: false,
    shortDescription: 'A residential scheme comprising two two-bedroom apartments.',
    description: 'A residential development comprising two two-bedroom apartments.',
    imageFiles: ['five-bedroom-duplex-two-bedroom-units-01.jpg','five-bedroom-duplex-two-bedroom-units-02.jpg'],
  },
]

async function run() {
  if(!process.env.SANITY_TOKEN) throw new Error('SANITY_TOKEN required')
  const uploaded = {}
  for(const img of imageFiles) {
    const filePath = path.join(imagesDir, img.file)
    const asset = await client.assets.upload('image', createReadStream(filePath), {filename: img.file})
    uploaded[img.file] = asset._id
    console.log('UPLOADED', img.file)
  }
  const catMap = {}
  for(const cat of categories) {
    const doc = await client.create({
      _type: 'category',
      _id: 'drafts.category-' + cat.slug,
      title: cat.title,
      slug: {current: cat.slug},
      order: cat.order,
    })
    catMap[cat.title] = doc._id
    console.log('CAT', cat.title)
  }
  for(const p of projects) {
    const coverFile = p.imageFiles[0]
    const coverRef = {_type: 'image', asset: {_type: 'reference', _ref: uploaded[coverFile]}, alt: p.title}
    const gallery = p.imageFiles.slice(1).map((f, idx) => ({
      _type: 'galleryImage',
      image: {_type: 'image', asset: {_type: 'reference', _ref: uploaded[f]}},
      alt: p.title + ' ' + (idx+2),
    }))
    const cats = p.categories.map(c => ({_type: 'reference', _ref: catMap[c]}))
    const doc = {
      _type: 'project',
      _id: 'drafts.project-legacy-' + p.legacyId,
      title: p.title,
      slug: {current: p.slug},
      legacyId: p.legacyId,
      categories: cats,
      location: p.location || undefined,
      year: p.year || undefined,
      status: p.status || undefined,
      client: p.client || undefined,
      architect: p.architect,
      order: p.order,
      featured: p.featured,
      shortDescription: p.shortDescription,
      description: p.description,
      coverImage: coverRef,
      gallery: gallery.length ? gallery : undefined,
    }
    await client.create(doc)
    console.log('PROJ', p.title, p.legacyId)
  }
}
run().catch(e => { console.error('ERR', e.message); process.exit(1); })
