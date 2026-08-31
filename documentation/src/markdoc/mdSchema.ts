import { getRuntimeSchema } from '@pluralsh/design-system/dist/markdoc'
import merge from 'lodash/merge'

import * as config from './config'
import * as functions from './functions'
import { nodes } from './nodes'
import { tags } from './tags'

import type { MarkdocNextJsPageProps } from '@markdoc/next.js'

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
