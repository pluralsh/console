import { createColumnHelper } from '@tanstack/react-table'
import { GitHubLogoIcon } from '@pluralsh/design-system'
import { ClusterProviderFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { useTheme } from 'styled-components'

import { getProviderIconURL, getProviderName } from 'components/utils/Provider'

import { UpdateProvider } from './UpdateProvider'

const columnHelper = createColumnHelper<Edge<ClusterProviderFragment>>()

export const ColProvider = columnHelper.accessor(({ node }) => node?.cloud, {
  id: 'provider',
  header: 'Provider',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()

    return (
      <ColWithIcon
        icon={getProviderIconURL(getValue() || '', theme.mode !== 'light')}
        truncate={false}
      >
        {getProviderName(getValue())}
      </ColWithIcon>
    )
  },
})

export const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  enableGlobalFilter: true,
  //   meta: { truncate: true },
  cell: ({ getValue }) => getValue(),
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

export const getColActions = ({ refetch }: { refetch: () => void }) =>
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    cell: ({
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        node && (
          <div
            css={{
              display: 'flex',
              flexGrow: 0,
              gap: theme.spacing.large,
              alignItems: 'center',
            }}
          >
            {node.editable && (
              <UpdateProvider
                provider={node}
                refetch={refetch}
              />
            )}
          </div>
        )
      )
    },
  })
