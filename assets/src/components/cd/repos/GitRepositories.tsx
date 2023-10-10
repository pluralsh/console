import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Chip, EmptyState, Table } from '@pluralsh/design-system'
import {
  AuthMethod,
  GitRepositoriesDocument,
  type GitRepositoriesRowFragment,
  useDeleteGitRepositoryMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { ComponentProps, useMemo, useState } from 'react'
import { type TableState } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { createMapperWithFallback } from 'utils/mapping'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { removeConnection, updateCache } from 'utils/graphql'

import { useSetCDHeaderContent } from '../ContinuousDeployment'

import {
  ColAuthMethod,
  ColCreatedAt,
  // ColOwner,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
  getColActions,
} from './GitRepositoriesColumns'
import { ImportGit } from './GitRepositoriesImportGit'
import { GitRepositoriesFilters } from './GitRepositoriesFilters'

const POLL_INTERVAL = 10 * 1000

// Will need to update once delete mutation exists in API
export function DeleteGitRepository({
  repo,
  refetch,
}: {
  repo: Pick<GitRepositoriesRowFragment, 'id' | 'url'>
  refetch: () => void
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteGitRepositoryMutation({
    variables: { id: repo.id ?? '' },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: GitRepositoriesDocument,
        update: (prev) =>
          removeConnection(prev, data?.deleteGitRepository, 'gitRepositories'),
      }),
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete Git Repository"
        text={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <p>Are you sure you want to delete this Git repository?</p>
            <p>{repo.url}</p>
          </div>
        }
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export default function GitRepositories() {
  const theme = useTheme()
  const { data, error, refetch } = useGitRepositoriesQuery({
    pollInterval: POLL_INTERVAL,
  })
  const columns = useMemo(
    () => [
      ColRepo,
      ColAuthMethod,
      ColStatus,
      ColCreatedAt,
      ColUpdatedAt,
      ColPulledAt,
      // ColOwner,
      getColActions({ refetch }),
    ],
    [refetch]
  )

  useSetCDHeaderContent(
    useMemo(() => <ImportGit refetch={refetch} />, [refetch])
  )
  const [tableFilters, setTableFilters] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
      }),
      [tableFilters]
    )

  if (error) {
    return (
      <EmptyState message="Looks like you don't have any Git repositories yet." />
    )
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <GitRepositoriesFilters
        data={data}
        setTableFilters={setTableFilters}
      />
      {!isEmpty(data?.gitRepositories?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.gitRepositories?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any Git repositories yet." />
      )}
    </div>
  )
}
