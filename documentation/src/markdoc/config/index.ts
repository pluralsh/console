/* Config must be exported from this file to work with markdoc/nextjs plugin */
import { variables as defaultVariables } from '@pluralsh/design-system/dist/markdoc/config'
import merge from 'lodash/merge'

export const variables = merge(defaultVariables, {
  docsGlobalTestVar: 'Docs global test content',
})
