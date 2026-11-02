import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'raw'})
const draftIds = [1, 2, 3, 4, 5].map((legacyId) => `drafts.project-legacy-${legacyId}`)

const drafts = await client.fetch(
  `*[_id in $ids] | order(legacyId asc) {_id, _rev, legacyId, title, "slug": slug.current}`,
  {ids: draftIds},
)

if (drafts.length !== 5) {
  throw new Error(`Expected 5 drafts before publishing, found ${drafts.length}`)
}

const actions = drafts.map((draft) => ({
  actionType: 'sanity.action.document.publish',
  draftId: draft._id,
  ifDraftRevisionId: draft._rev,
  publishedId: draft._id.replace(/^drafts\./, ''),
}))

const result = await client.action(actions)

console.log(
  JSON.stringify(
    {
      drafts,
      actions,
      result,
    },
    null,
    2,
  ),
)
