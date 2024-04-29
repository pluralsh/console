import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import { PolicyConstraint } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'

import { Chip, ErrorIcon } from '@pluralsh/design-system'
import { getClusterIconUrl } from 'components/utils/Provider'

const columnHelper = createColumnHelper<Edge<PolicyConstraint>>()

export const ColPolicyName = columnHelper.accessor(({ node }) => node, {
  id: 'name',
  header: 'Name',
  meta: { truncate: true, gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return policy ? policy.name : '--'
  },
})

export const ColCluster = columnHelper.accessor(
  ({ node }) => node?.cluster?.name,
  {
    id: 'clusterName',
    header: 'Cluster',
    cell: ({ getValue, row: { original } }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const clusterName = getValue()

      return (
        <ColWithIcon
          icon={getClusterIconUrl({
            cluster: original?.node?.cluster,
            mode: theme.mode,
          })}
        >
          {clusterName}
        </ColWithIcon>
      )
    },
  }
)

export const ColViolations = columnHelper.accessor(({ node }) => node, {
  id: 'violations',
  header: 'Violations',
  meta: { truncate: true, gridTemplate: 'auto' },
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
  meta: { truncate: true, gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return policy ? policy.description : ''
  },
})
