import { createColumnHelper } from '@tanstack/react-table'

import { PolicyConstraint } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import {
  CaretRightIcon,
  Chip,
  ErrorIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { ColClusterContent } from 'components/cd/clusters/ClustersColumns'

const columnHelper = createColumnHelper<Edge<PolicyConstraint>>()

export const ColPolicyName = columnHelper.accessor(({ node }) => node, {
  id: 'name',
  header: 'Policy',
  meta: { truncate: true, gridTemplate: 'minmax(250px, auto)' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return policy ? policy.name : '--'
  },
})

export const ColCluster = columnHelper.accessor(({ node }) => node?.cluster, {
  id: 'cluster',
  header: 'Cluster',
  cell: function Cell({ getValue }) {
    const cluster = getValue()

    return <ColClusterContent cluster={cluster} />
  },
})

export const ColViolations = columnHelper.accessor(({ node }) => node, {
  id: 'violations',
  header: 'Violations',
  meta: { truncate: false, gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const policy = getValue()
    const count = policy?.violationCount

    return (
      <Chip
        icon={count ? <ErrorIcon /> : undefined}
        severity={count ? 'danger' : 'success'}
        width={count ? 'auto' : 'fit-content'}
      >
        {count}
      </Chip>
    )
  },
})

export const ColDescription = columnHelper.accessor(({ node }) => node, {
  id: 'description',
  header: 'Description',
  meta: { truncate: true, gridTemplate: 'minmax(180px, auto)' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return <div>{policy ? policy.description : ''}</div>
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  cell: ({ row: { original } }) => (
    <IconFrame
      clickable
      tooltip={`View ${original?.node?.name} details`}
      textValue={`View ${original?.node?.name} details`}
      icon={<CaretRightIcon />}
    />
  ),
})
