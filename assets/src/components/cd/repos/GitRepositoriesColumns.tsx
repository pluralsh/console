import { Chip, GitHubLogoIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import {
  type GitRepositoryFragment,
  HelmRepositoryFragment,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'

import { CHART_ICON_DARK } from 'components/utils/Provider'

import { GitHealthChip, gitHealthToLabel } from './GitHealthChip'
import { UpdateGitRepository } from './GitRepositoriesUpdateGit'
import { AuthMethodChip, DeleteGitRepository } from './Repositories'

const columnHelper =
  createColumnHelper<Edge<GitRepositoryFragment | HelmRepositoryFragment>>()

type GitNode = Edge<GitRepositoryFragment>['node']
type HelmNode = Edge<HelmRepositoryFragment>['node']

export const ColRepo = columnHelper.accessor(({ node }) => node?.url, {
  id: 'repository',
  header: 'Repository',
  enableSorting: true,
  enableGlobalFilter: true,
  meta: { truncate: true },
  cell: ({ getValue, row }) => {
    const icon =
      row.original.node?.__typename === 'GitRepository' ? (
        <GitHubLogoIcon />
      ) : (
        CHART_ICON_DARK
      )

    return (
      <ColWithIcon
        truncateLeft
        icon={icon}
      >
        {getValue()}
      </ColWithIcon>
    )
  },
})

export const ColProvider = columnHelper.accessor(
  ({ node }) => (node as HelmNode)?.provider,
  {
    id: 'provider',
    header: 'Provider',
    enableSorting: true,
    cell: ({ getValue }) => <Chip severity="neutral">{getValue()}</Chip>,
  }
)

export const ColAuthMethod = columnHelper.accessor(
  ({ node }) => (node as GitNode)?.authMethod,
  {
    id: 'authMethod',
    header: 'Auth method',
    enableSorting: true,
    cell: ({ getValue }) => <AuthMethodChip authMethod={getValue()} />,
  }
)
export const ColStatus = columnHelper.accessor(
  ({ node }) => gitHealthToLabel(node?.health),
  {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: 'equalsString',
    cell: ({
      row: {
        original: { node },
      },
    }) => (
      <GitHealthChip
        health={node?.health}
        error={(node as GitNode)?.error}
      />
    ),
  }
)

export const ColCreatedAt = columnHelper.accessor(
  ({ node }) => (node?.insertedAt ? new Date(node?.insertedAt) : undefined),
  {
    id: 'createdAt',
    header: 'Created ',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({
      row: {
        original: { node },
      },
    }) => <DateTimeCol date={node?.insertedAt} />,
  }
)

export const ColUpdatedAt = columnHelper.accessor(
  ({ node }) => (node?.updatedAt ? new Date(node?.updatedAt) : undefined),
  {
    id: 'updatedAt',
    header: 'Updated',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({
      row: {
        original: { node },
      },
    }) => <DateTimeCol date={node?.updatedAt} />,
  }
)

export const ColPulledAt = columnHelper.accessor(
  ({ node }) => (node?.pulledAt ? new Date(node?.pulledAt) : undefined),
  {
    id: 'pulledAt',
    header: 'Last pull',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({
      row: {
        original: { node },
      },
    }) => <DateTimeCol date={node?.pulledAt || ''} />,
  }
)

/* Update later when API is updated */
export const ColOwner = columnHelper.accessor(
  ({ node }) => (node as any)?.owner,
  {
    id: 'owner',
    header: 'Owner',
    enableSorting: true,
    cell: ({ getValue }) => getValue() || 'Need API',
  }
)

export const ColActions = columnHelper.accessor(({ node }) => node?.id, {
  id: 'actions',
  header: '',
  cell: function Cell({
    table,
    row: {
      original: { node },
    },
  }) {
    const theme = useTheme()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!(node as GitNode)?.editable) {
      return null
    }

    return (
      node && (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            alignItems: 'center',
          }}
        >
          <UpdateGitRepository
            repo={node as GitRepositoryFragment}
            refetch={refetch}
          />
          <DeleteGitRepository
            repo={node as GitRepositoryFragment}
            refetch={refetch}
          />
        </div>
      )
    )
  },
})
