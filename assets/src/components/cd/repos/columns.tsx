import { createColumnHelper } from '@tanstack/react-table'
import { Button, ClusterIcon } from '@pluralsh/design-system'
import { type GitRepositoriesRowFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { useTheme } from 'styled-components'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import {
  AuthMethodChip,
  ColWithIcon,
  DeleteGitRepository,
  GitHealthChip,
  gitHealthToLabel,
} from './GitRepositories'

const columnHelper = createColumnHelper<Edge<GitRepositoriesRowFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.url, {
    id: 'repository',
    header: 'Repository',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => (
      <ColWithIcon
        truncateLeft
        icon={<ClusterIcon />}
      >
        {getValue()}
      </ColWithIcon>
    ),
  }),
  columnHelper.accessor(({ node }) => node?.authMethod, {
    id: 'authMethod',
    header: 'Auth method',
    enableSorting: true,
    cell: ({
      getValue,
      row: {
        original: { node },
      },
    }) => <AuthMethodChip authMethod={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => gitHealthToLabel(node?.health), {
    id: 'status',
    header: 'Status',
    enableSorting: true,
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
  }),
  columnHelper.accessor(
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
  ),
  columnHelper.accessor(
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
      }) => {
        console.log('node', node)

        return <DateTimeCol dateString={node?.updatedAt} />
      },
    }
  ),
  columnHelper.accessor(
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
      }) => {
        console.log('node', node)

        return <DateTimeCol dateString={node?.pulledAt || ''} />
      },
    }
  ),

  /* Update later when API is updated */
  columnHelper.accessor(({ node }) => (node as any)?.owner, {
    id: 'owner',
    header: 'Owner',
    enableSorting: true,
    cell: ({ getValue }) => getValue() || 'Need API',
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    enableSorting: true,
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
              gap: theme.spacing.large,
              alignItems: 'center',
            }}
          >
            <Button
              secondary
              small
              onClick={() => {
                alert(`Create ${node?.id}`)
              }}
            >
              Create
            </Button>
            <Button
              secondary
              small
              onClick={() => {
                alert(`Update ${node?.id}`)
              }}
            >
              Update
            </Button>
            <DeleteGitRepository repo={node} />
          </div>
        )
      )
    },
  }),
]
