import { getRuntimeSchema } from '@pluralsh/design-system'

import type { MarkdocNextJsPageProps } from '@markdoc/next.js'
import merge from 'lodash/merge'

import * as config from './config'
import { functions } from './functions'
import { nodes } from './nodes'
import { tags } from './tags'

const baseSchema = merge(
  {
    nodes,
    functions,
    tags,
  },
  config
)

const { components, ...schemaConfig } = getRuntimeSchema(baseSchema)

export { components, schemaConfig as config }

export type MarkdocPage = MarkdocNextJsPageProps['markdoc']
