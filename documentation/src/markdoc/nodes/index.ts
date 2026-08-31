/* Markdoc nodes must be exported from this file to work with markdoc/nextjs plugin */

import * as designSystemNodes from '@pluralsh/design-system/dist/markdoc/nodes'

export const nodes = {
  ...designSystemNodes,
}
