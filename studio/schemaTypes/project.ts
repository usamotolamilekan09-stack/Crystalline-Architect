import {defineArrayMember, defineField, defineType} from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'details', title: 'Details'},
    {name: 'media', title: 'Media'},
    {name: 'publishing', title: 'Publishing'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Project title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().max(110),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
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
              type: 'project',
              slug,
              publishedId,
              draftId,
            }
          )

          return count === 0 || 'This slug is already used by another project.'
        }),
    }),
    defineField({
      name: 'legacyId',
      title: 'Legacy numeric ID',
      type: 'number',
      group: 'publishing',
      description:
        'Preserves existing links such as project.html?id=1. Do not change this after publication.',
      validation: (Rule) =>
        Rule.integer()
          .positive()
          .custom(async (value, context) => {
            if (value == null) return true

            const publishedId = context.document?._id?.replace(/^drafts\./, '') || ''
            const draftId = publishedId ? `drafts.${publishedId}` : ''
            const client = context.getClient({apiVersion: '2025-02-19'})
            const count = await client.fetch<number>(
              'count(*[_type == $type && legacyId == $legacyId && !(_id in [$publishedId, $draftId])])',
              {
                type: 'project',
                legacyId: value,
                publishedId,
                draftId,
              }
            )

            return count === 0 || 'This legacy numeric ID is already used by another project.'
          }),
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'category'}],
        }),
      ],
      options: {
        layout: 'tags',
      },
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      group: 'details',
      description: 'Display value used on cards and project details.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      group: 'details',
      description: 'Display value, for example 2026 or July 2026.',
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: 'status',
      title: 'Project status',
      type: 'string',
      group: 'details',
      options: {
        layout: 'dropdown',
        list: [
          {title: 'Completed', value: 'Completed'},
          {title: 'Under Construction', value: 'Under Construction'},
          {title: 'Proposed', value: 'Proposed'},
          {title: 'In Design', value: 'In Design'},
          {title: 'On Hold', value: 'On Hold'},
        ],
      },
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'architect',
      title: 'Architect',
      type: 'string',
      group: 'details',
      initialValue: 'Crystalline Architects',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Used on project cards and as the project meta description.',
      validation: (Rule) => Rule.required().max(220),
    }),
    defineField({
      name: 'description',
      title: 'Project description',
      type: 'text',
      rows: 7,
      group: 'content',
      validation: (Rule) => Rule.required().max(5000),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      group: 'media',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (Rule) => Rule.required().max(160),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery images',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          name: 'galleryImage',
          title: 'Gallery image',
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: {
                hotspot: true,
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
              validation: (Rule) => Rule.required().max(160),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              validation: (Rule) => Rule.max(200),
            }),
          ],
          preview: {
            select: {
              title: 'alt',
              subtitle: 'caption',
              media: 'image',
            },
          },
        }),
      ],
      validation: (Rule) => Rule.max(50),
    }),
    defineField({
      name: 'galleryNote',
      title: 'Gallery note',
      type: 'text',
      rows: 2,
      group: 'media',
      description: 'Optional note shown below the gallery.',
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: 'featured',
      title: 'Featured project',
      type: 'boolean',
      group: 'publishing',
      description: 'Featured projects appear on the homepage, subject to display order.',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'publishing',
      description: 'Lower numbers appear first. Defaults to 99 when not set.',
      initialValue: 99,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'displayOrder',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
    {
      title: 'Featured first',
      name: 'featuredFirst',
      by: [
        {field: 'featured', direction: 'desc'},
        {field: 'order', direction: 'asc'},
      ],
    },
    {
      title: 'Project title',
      name: 'projectTitle',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'status',
      location: 'location',
      media: 'coverImage',
      order: 'order',
    },
    prepare({title, subtitle, location, media, order}) {
      return {
        title,
        subtitle: [location, subtitle].filter(Boolean).join(' · ') || `Display order ${order ?? 99}`,
        media,
      }
    },
  },
})
