import { createColumnHelper } from '@tanstack/react-table'

import { ManagedNamespace } from 'generated/graphql'
import { toDateOrUndef } from 'utils/datetime'

import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { Edge } from 'utils/graphql'

const columnHelper = createColumnHelper<Edge<ManagedNamespace>>()

export const ColName = columnHelper.accessor(
  (namespace) => namespace.node?.name,
  {
    id: 'name',
    header: 'Name',
    meta: { truncate: true, gridTemplate: 'minmax(180px,1fr)' },
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }
)

export const ColLastActivity = columnHelper.accessor(
  (namespace) => {
    const updatedAt = toDateOrUndef(namespace?.node?.updatedAt)
    const insertedAt = toDateOrUndef(namespace?.node?.insertedAt)

    return updatedAt || insertedAt || undefined
  },
  {
    id: 'lastUpdated',
    header: 'Last Updated ',
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)

export const ColLabels = columnHelper.accessor(({ node }) => node, {
  id: 'labels',
  header: 'Labels',
  meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  cell: ({ getValue }) => {
    const namespace = getValue()

    const labels = Object.keys(namespace?.labels || {})
      ?.map((label) => `${label}: ${namespace?.labels?.[label]}`)
      .join(', ')

    return labels || ''
  },
})

export const ColProject = columnHelper.accessor(
  ({ node }) => node?.project?.name,
  {
    id: 'project',
    header: 'Project',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  }
)

export const ColAnnotations = columnHelper.accessor(({ node }) => node, {
  id: 'annotations',
  header: 'Annotations',
  meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  cell: ({ getValue }) => {
    const namespace = getValue()

    const annotations = Object.keys(namespace?.annotations || {})
      ?.map(
        (annotation) => `${annotation}: ${namespace?.annotations?.[annotation]}`
      )
      .join(', ')

    return annotations || ''
  },
})
