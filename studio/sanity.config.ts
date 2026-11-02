import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

const viteEnv = (import.meta as ImportMeta & {env?: Record<string, string | undefined>}).env ?? {}

const projectId = viteEnv.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || 'w89s00vy'
const dataset = viteEnv.SANITY_STUDIO_DATASET || process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'crystalline-architects',
  title: 'Crystalline Architects',
  projectId,
  dataset,
  plugins: [structureTool({structure}), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
