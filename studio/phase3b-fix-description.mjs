import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'})
const draftId = 'drafts.project-legacy-3'

const description = 'A residential building design documented through two exterior renders.'
const shortDescription = 'A residential building design presented through two exterior renders.'

const before = await client.fetch(
  `*[_id == $id][0]{_id, _rev, shortDescription, description}`,
  {id: draftId},
)

const updated = await client
  .patch(draftId)
  .set({shortDescription, description})
  .commit({returnDocuments: true})

console.log(JSON.stringify({before, updated}, null, 2))
