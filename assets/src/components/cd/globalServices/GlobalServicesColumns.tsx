import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import { GlobalService } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { toDateOrUndef } from 'utils/date'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'

const columnHelper = createColumnHelper<Edge<GlobalService>>()

export const ColServiceName = columnHelper.accessor(({ node }) => node, {
  id: 'service',
  header: 'Service',
  meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
  cell: function Cell({ getValue }) {
    const serviceDeployment = getValue()

    return serviceDeployment ? serviceDeployment.name : '--'
  },
})

export const ColDistribution = columnHelper.accessor(({ node }) => node, {
  id: 'distribution',
  header: 'Distribution',
  meta: { truncate: true, gridTemplate: 'minmax(150px,250px)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const globalService = getValue()

    return (
      <ColWithIcon
        icon={getDistroProviderIconUrl({
          distro: globalService?.distro,
          provider: globalService?.provider?.cloud,
          mode: theme.mode,
        })}
      >
        {globalService?.distro || 'All Distributions'}
      </ColWithIcon>
    )
  },
})

export const ColTags = columnHelper.accessor(({ node }) => node, {
  id: 'tags',
  header: 'Tags',
  meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const svc = getValue()

    const tags = svc?.tags
      ?.map((tag) => `${tag?.name}: ${tag?.value}`)
      .join(', ')

    return tags || ''
  },
})

export const ColLastActivity = columnHelper.accessor(
  ({ node }) => {
    const updatedAt = toDateOrUndef(node?.updatedAt)
    const insertedAt = toDateOrUndef(node?.insertedAt)

    return updatedAt || insertedAt || undefined
  },
  {
    id: 'lastUpdated',
    header: 'Last Updated ',
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)
