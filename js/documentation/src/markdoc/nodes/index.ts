/* Markdoc nodes must be exported from this file to work with markdoc/nextjs plugin */

import { markdocNodes as designSystemNodes } from '@pluralsh/design-system'

export const nodes = {
  ...designSystemNodes,
}
