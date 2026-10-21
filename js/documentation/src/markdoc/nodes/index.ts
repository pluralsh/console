/* Markdoc nodes must be exported from this file to work with markdoc/nextjs plugin */

import { markdocNodes as designSystemNodes } from '@pluralsh/design-system'

import { DocsTable } from '@src/components/DocsTable'

export const nodes = {
  ...designSystemNodes,
  table: { ...designSystemNodes.table, render: DocsTable },
}
