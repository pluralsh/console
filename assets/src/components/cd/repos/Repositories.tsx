import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Chip,
  EmptyState,
  Switch,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { skipToken } from '@apollo/client'
import {
  AuthMethod,
  GitRepositoriesDocument,
  GitRepositoriesQuery,
  type GitRepositoryFragment,
  HelmRepositoriesQuery,
  useDeleteGitRepositoryMutation,
  useGitRepositoriesQuery,
  useHelmRepositoriesQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { useMemo, useState } from 'react'
import { type TableState } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { createMapperWithFallback } from 'utils/mapping'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { removeConnection, updateCache } from 'utils/graphql'

import { CD_REL_PATH } from 'routes/cdRoutesConsts'

import {
  CD_BASE_CRUMBS,
  POLL_INTERVAL,
  useSetCDHeaderContent,
} from '../ContinuousDeployment'

import {
  ColName,
  ColNamespace,
  ColProvider,
  ColStatus,
  ColType,
  ColUrl,
} from './HelmRepositoriesColumns'
import { ImportGit } from './GitRepositoriesImportGit'
import { GitRepositoriesFilters } from './GitRepositoriesFilters'
import { GitRepositoryTable } from './GitRepositoryTable'

const crumbs = [...CD_BASE_CRUMBS, { label: 'git', url: `/${CD_REL_PATH}/git` }]

// Will need to update once delete mutation exists in API
export function DeleteGitRepository({
  repo,
  refetch,
}: {
  repo: Pick<GitRepositoryFragment, 'id' | 'url'>
  refetch: Nullable<() => void>
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

enum RepoKind {
  Git = 'Git',
  Helm = 'Helm',
}

export default function GitRepositories() {
  const [repoKind, setRepoKind] = useState(RepoKind.Git)
  const kindLabel = repoKind === RepoKind.Helm ? 'Helm' : 'Git'
  const theme = useTheme()
  const gitQueryResult = useGitRepositoriesQuery({
    skip: repoKind !== RepoKind.Git,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const helmQueryResult = useHelmRepositoriesQuery({
    skip: repoKind !== RepoKind.Helm,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const { data, error, refetch } =
    repoKind === RepoKind.Helm ? helmQueryResult : gitQueryResult

  console.log('skipToken', skipToken)

  console.log('helmRepositories', helmQueryResult.data?.helmRepositories)
  console.log('gitRepositories', gitQueryResult?.data?.gitRepositories?.edges)

  useSetBreadcrumbs(crumbs)

  useSetCDHeaderContent(
    useMemo(() => <ImportGit refetch={refetch} />, [refetch])
  )
  const [tableFilters, setTableFilters] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  if (error) {
    return (
      <EmptyState
        message={`Looks like you don’t have any ${kindLabel} repositories yet.`}
      />
    )
  }
  const list =
    repoKind === RepoKind.Helm
      ? helmQueryResult?.data?.helmRepositories
      : gitQueryResult?.data?.gitRepositories?.edges

  console.log('list', list)

  if (!list) {
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
      <div css={{ display: 'flex', gap: theme.spacing.medium }}>
        <Switch
          checked={repoKind === RepoKind.Helm}
          onChange={(v) => setRepoKind(v ? RepoKind.Helm : RepoKind.Git)}
        >
          Helm?
        </Switch>
        <GitRepositoriesFilters
          data={data}
          setTableFilters={setTableFilters}
        />
      </div>
      {!isEmpty(list) ? (
        <FullHeightTableWrap>
          {repoKind === RepoKind.Helm ? (
            <HelmRepositoryTable
              data={data as HelmRepositoriesQuery}
              filters={tableFilters}
              refetch={refetch}
            />
          ) : (
            <GitRepositoryTable
              data={data as GitRepositoriesQuery}
              filters={tableFilters}
              refetch={refetch}
            />
          )}
        </FullHeightTableWrap>
      ) : (
        <EmptyState
          message={`Looks like you don’t have any ${kindLabel} repositories yet.`}
        />
      )}
    </div>
  )
}

const helmRepoColumns = [
  ColName,
  ColNamespace,
  ColProvider,
  ColType,
  ColUrl,
  ColStatus,
]

function HelmRepositoryTable({
  data,
  refetch,
  filters,
}: {
  data: HelmRepositoriesQuery
  filters: Record<string, any>
  refetch: () => void
}) {
  const reactTableOptions = useMemo(
    () => ({
      state: {
        ...filters,
      },
      meta: { refetch },
    }),
    [refetch, filters]
  )

  console.log('data', data)

  return (
    <Table
      data={data?.helmRepositories || []}
      columns={helmRepoColumns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
      reactTableOptions={reactTableOptions}
    />
  )
}
