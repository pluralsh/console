import {
  getRuntimeSchema,
  markdocConfig,
  markdocFunctions,
  markdocNodes,
  markdocTags,
} from '@pluralsh/design-system'
import merge from 'lodash/merge'

// Extend default schema here
const baseSchema = merge(
  {
    nodes: markdocNodes,
    functions: markdocFunctions,
    tags: markdocTags,
    ...markdocConfig,
  },
  {
    variables: { consoleGlobalTestVar: 'Console global test content' },
  }
)

const { components, ...schemaConfig } = getRuntimeSchema(baseSchema)

export { components, schemaConfig as config }
