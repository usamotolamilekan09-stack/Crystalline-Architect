import {defineField, defineType} from 'sanity'

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const slug = value?.current
          if (!slug) return true

          const publishedId = context.document?._id?.replace(/^drafts\./, '') || ''
          const draftId = publishedId ? `drafts.${publishedId}` : ''
          const client = context.getClient({apiVersion: '2025-02-19'})
          const count = await client.fetch<number>(
            'count(*[_type == $type && slug.current == $slug && !(_id in [$publishedId, $draftId])])',
            {
              type: 'category',
              slug,
              publishedId,
              draftId,
            }
          )

          return count === 0 || 'This slug is already used by another category.'
        }),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Controls the order of filter buttons on the projects page.',
      initialValue: 99,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'displayOrder',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
})
