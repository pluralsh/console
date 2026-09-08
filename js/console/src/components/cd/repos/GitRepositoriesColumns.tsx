import { Chip, Flex, GitHubLogoIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import {
  AuthMethod,
  type GitRepositoryFragment,
  HelmAuthProvider,
  HelmRepositoryFragment,
  useDeleteGitRepositoryMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'

import { CHART_ICON_DARK } from 'components/utils/Provider'

import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { capitalize } from 'lodash'
import { useState } from 'react'
import { GitHealthChip } from './GitHealthChip'
import { UpdateGitRepository } from './GitRepositoriesUpdateGit'

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
  ({ node }) => (node as HelmNode)?.provider ?? HelmAuthProvider.Basic,
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
    cell: ({ getValue }) => {
      const authMethod = getValue()
      return (
        <Chip severity="neutral">
          {authMethod ? authMethodToLabel[authMethod] : 'Unknown'}
        </Chip>
      )
    },
  }
)

const authMethodToLabel: Record<AuthMethod, string> = {
  [AuthMethod.Basic]: 'Basic',
  [AuthMethod.Ssh]: 'SSH',
}

export const ColStatus = columnHelper.accessor(
  ({ node }) => capitalize(node?.health ?? 'Unknown'),
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

export const ColActions = columnHelper.accessor(({ node }) => node?.id, {
  id: 'actions',
  header: '',
  cell: function Cell({
    row: {
      original: { node },
    },
  }) {
    if (!(node as GitNode)?.editable) return null

    return (
      node && (
        <Flex
          gap="large"
          align="center"
        >
          <UpdateGitRepository repo={node as GitRepositoryFragment} />
          <DeleteGitRepository repo={node as GitRepositoryFragment} />
        </Flex>
      )
    )
  },
})

function DeleteGitRepository({
  repo,
}: {
  repo: Pick<GitRepositoryFragment, 'id' | 'url'>
}) {
  const { spacing } = useTheme()
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading, error }] = useDeleteGitRepositoryMutation({
    variables: { id: repo.id ?? '' },
    onCompleted: () => setConfirm(false),
    awaitRefetchQueries: true,
    refetchQueries: [
      'GitRepositories',
      'HelmRepositories',
      'FluxHelmRepositories',
    ],
  })

  return (
    <>
      <DeleteIconButton
        tooltip
        onClick={() => setConfirm(true)}
      />
      <Confirm
        open={confirm}
        title="Delete Git Repository"
        text="Are you sure you want to delete this Git repository?"
        extraContent={
          <span css={{ marginTop: spacing.medium }}>{repo.url}</span>
        }
        confirmationText="Delete"
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}
