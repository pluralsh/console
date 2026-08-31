/* Config must be exported from this file to work with markdoc/nextjs plugin */
import { markdocConfig } from '@pluralsh/design-system'

import merge from 'lodash/merge'

export const variables = merge(markdocConfig.variables, {
  docsGlobalTestVar: 'Docs global test content',
})
