import { createColumnHelper } from '@tanstack/react-table'
import { GitHubLogoIcon } from '@pluralsh/design-system'
import { type GitRepositoriesRowFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { useTheme } from 'styled-components'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'

import { AuthMethodChip, DeleteGitRepository } from './GitRepositories'
import { GitHealthChip, gitHealthToLabel } from './GitHealthChip'
import { UpdateGitRepository } from './GitRepositoriesUpdateGit'

const columnHelper = createColumnHelper<Edge<GitRepositoriesRowFragment>>()

export const ColRepo = columnHelper.accessor(({ node }) => node?.url, {
  id: 'repository',
  header: 'Repository',
  enableSorting: true,
  enableGlobalFilter: true,
  meta: { truncate: true },
  cell: ({ getValue }) => (
    <ColWithIcon
      truncateLeft
      icon={<GitHubLogoIcon />}
    >
      {getValue()}
    </ColWithIcon>
  ),
})

export const ColAuthMethod = columnHelper.accessor(
  ({ node }) => node?.authMethod,
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
        error={node?.error}
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
    }) => <DateTimeCol dateString={node?.insertedAt} />,
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
    }) => <DateTimeCol dateString={node?.updatedAt} />,
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
    }) => <DateTimeCol dateString={node?.pulledAt || ''} />,
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
  cell: ({
    table,
    row: {
      original: { node },
    },
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!node?.editable) {
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
            repo={node}
            refetch={refetch}
          />
          <DeleteGitRepository
            repo={node}
            refetch={refetch}
          />
        </div>
      )
    )
  },
})
