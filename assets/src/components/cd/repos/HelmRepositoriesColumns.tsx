import { createColumnHelper } from '@tanstack/react-table'

import { GitHealth, type HelmRepositoryFragment } from 'generated/graphql'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { CHART_ICON_DARK, CHART_ICON_LIGHT } from 'components/utils/Provider'

import { useTheme } from 'styled-components'

import { HelmHealthChip } from './HelmHealthChip'

const columnHelper = createColumnHelper<HelmRepositoryFragment>()

export const ColName = columnHelper.accessor((repo) => repo?.metadata.name, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <ColWithIcon
        truncateLeft
        icon={theme.mode === 'light' ? CHART_ICON_LIGHT : CHART_ICON_DARK}
      >
        {getValue()}
      </ColWithIcon>
    )
  },
})
export const ColNamespace = columnHelper.accessor(
  (repo) => repo?.metadata.namespace,
  {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <>{getValue()}</>,
  }
)

export const ColAuthMethod = columnHelper.accessor((node) => node?.spec.type, {
  id: 'type',
  header: 'Type',
  enableSorting: true,
  cell: ({ getValue }) => getValue(),
})

export const ColStatus = columnHelper.accessor(
  (repo) => (repo?.status?.ready ? GitHealth.Pullable : GitHealth.Failed),
  {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: 'equalsString',
    cell: ({ row }) => {
      const { ready, message } = row?.original?.status || {}

      return (
        <HelmHealthChip
          ready={ready}
          message={message}
        />
      )
    },
  }
)

export const ColProvider = columnHelper.accessor(
  (repo) => repo?.spec.provider,
  {
    id: 'specProvider',
    header: 'Provider ',
    enableSorting: true,
    cell: ({ getValue }) => getValue(),
  }
)

export const ColType = columnHelper.accessor((repo) => repo?.spec.type, {
  id: 'specType',
  header: 'Type',
  enableSorting: true,
  cell: ({ getValue }) => getValue(),
})

export const ColUrl = columnHelper.accessor((repo) => repo?.spec.url, {
  id: 'specUrl',
  header: 'Url',
  enableSorting: true,
  meta: { truncate: true },
  enableGlobalFilter: true,
  cell: ({ getValue }) => <div>{getValue()}</div>,
})
