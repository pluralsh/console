import { createColumnHelper } from '@tanstack/react-table'
import { GitHubLogoIcon } from '@pluralsh/design-system'
import { ClusterProviderFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { useTheme } from 'styled-components'

import { getProviderIconURL, getProviderName } from 'components/utils/Provider'

import DecoratedName from '../services/DecoratedName'

import { UpdateProvider } from './UpdateProvider'
import { DeleteProvider } from './DeleteProvider'

const columnHelper = createColumnHelper<Edge<ClusterProviderFragment>>()

export const ColProvider = columnHelper.accessor(({ node }) => node?.cloud, {
  id: 'provider',
  header: 'Provider',
  enableSorting: true,
  enableGlobalFilter: true,
  meta: { gridTemplate: `fit-content(200px)` },

  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()

    return (
      <ColWithIcon
        icon={getProviderIconURL(getValue() || '', theme.mode !== 'light')}
      >
        {getProviderName(getValue())}
      </ColWithIcon>
    )
  },
})

export const ColName = columnHelper.accessor(({ node }) => node, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: ({ getValue }) => {
    const provider = getValue()

    return (
      <DecoratedName deletedAt={provider?.deletedAt}>
        {provider?.name}
      </DecoratedName>
    )
  },
})

export const ColRepo = columnHelper.accessor(
  ({ node }) => node?.repository?.url,
  {
    id: 'repository',
    header: 'Repository',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) =>
      getValue() && (
        <ColWithIcon
          truncateLeft
          icon={<GitHubLogoIcon />}
        >
          {getValue()}
        </ColWithIcon>
      ),
  }
)

export const ColActions = columnHelper.accessor(({ node }) => node?.id, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: `fit-content(100px)` },
  cell: ({
    table,
    row: {
      original: { node },
    },
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const { refetch } = table.options.meta as { refetch?: () => void }

    return (
      node && (
        <div
          css={{
            display: 'flex',
            flexGrow: 0,
            gap: theme.spacing.large,
            alignItems: 'center',
            alignSelf: 'end',
          }}
        >
          {node.editable && (
            <>
              <UpdateProvider
                provider={node}
                refetch={refetch}
              />
              <DeleteProvider
                provider={node}
                refetch={refetch}
              />
            </>
          )}
        </div>
      )
    )
  },
})
