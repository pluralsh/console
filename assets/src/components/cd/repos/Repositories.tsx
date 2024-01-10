import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Chip,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
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
import { Key, useMemo, useState } from 'react'
import { isEmpty } from 'lodash'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { createMapperWithFallback } from 'utils/mapping'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { removeConnection, updateCache } from 'utils/graphql'

import { CD_REL_PATH, REPOS_REL_PATH } from 'routes/cdRoutesConsts'

import {
  CD_BASE_CRUMBS,
  POLL_INTERVAL,
  useSetCDHeaderContent,
} from '../ContinuousDeployment'

import {
  RepoKind,
  RepoKindSelector,
  repoKindToLabel,
} from '../utils/RepoKindSelector'

import {
  ColName,
  ColNamespace,
  ColProvider,
  ColStatus,
  ColType,
  ColUrl,
} from './HelmRepositoriesColumns'
import { ImportGit } from './GitRepositoriesImportGit'
import {
  RepositoriesFilters,
  countsFromGitRepos,
  countsFromHelmRepos,
} from './RepositoriesFilters'
import { GitRepositoriesTable } from './GitRepositoriesTable'

const crumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'repositories', url: `/${CD_REL_PATH}/${REPOS_REL_PATH}` },
]

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

export default function Repositories() {
  const [repoKind, setRepoKind] = useState(RepoKind.Git)
  const kindLabel = repoKindToLabel(repoKind)
  const theme = useTheme()
  const [statusFilterKey, setStatusFilterKey] = useState<Key>('ALL')
  const [filterString, setFilterString] = useState('')

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
  const list =
    repoKind === RepoKind.Helm
      ? helmQueryResult?.data?.helmRepositories
      : gitQueryResult?.data?.gitRepositories?.edges
  const statusCounts = useMemo(
    () =>
      repoKind === RepoKind.Git
        ? countsFromGitRepos(gitQueryResult?.data)
        : countsFromHelmRepos(helmQueryResult?.data),
    [gitQueryResult?.data, helmQueryResult?.data, repoKind]
  )

  useSetBreadcrumbs(crumbs)

  useSetCDHeaderContent(
    useMemo(() => <ImportGit refetch={refetch} />, [refetch])
  )

  if (error) {
    return (
      <EmptyState
        message={`Looks like you don’t have any ${kindLabel} repositories yet.`}
      />
    )
  }

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
        <div>
          <RepoKindSelector
            onKindChange={setRepoKind}
            selectedKind={repoKind}
          />
        </div>
        <RepositoriesFilters
          statusCounts={statusCounts}
          statusFilterKey={statusFilterKey}
          setStatusFilterKey={setStatusFilterKey}
          setFilterString={setFilterString}
        />
      </div>
      {!isEmpty(list) ? (
        <FullHeightTableWrap>
          {repoKind === RepoKind.Helm ? (
            <HelmRepositoriesTable
              data={data as HelmRepositoriesQuery}
              filterString={filterString}
              statusFilterKey={statusFilterKey}
              refetch={refetch}
            />
          ) : (
            <GitRepositoriesTable
              data={data as GitRepositoriesQuery}
              filterString={filterString}
              statusFilterKey={statusFilterKey}
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
  ColStatus,
  ColNamespace,
  ColProvider,
  ColType,
  ColUrl,
]

function HelmRepositoriesTable({
  data,
  refetch,
  filterString,
  statusFilterKey,
}: {
  data: HelmRepositoriesQuery
  filterString: string
  statusFilterKey: Key
  refetch: () => void
}) {
  const reactTableOptions = useMemo(
    () => ({
      state: {
        globalFilter: filterString,
        columnFilters: [
          ...(statusFilterKey !== 'ALL'
            ? [
                {
                  id: 'status',
                  value: statusFilterKey,
                },
              ]
            : []),
        ],
      },
      meta: { refetch },
    }),
    [filterString, refetch, statusFilterKey]
  )

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
