import { Chip, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import {
  AuthMethod,
  FluxHelmRepositoriesQuery,
  GitRepositoriesDocument,
  GitRepositoriesQuery,
  type GitRepositoryFragment,
  HelmRepositoriesQuery,
  useDeleteGitRepositoryMutation,
  useFluxHelmRepositoriesQuery,
  useGitRepositoriesQuery,
  useHelmRepositoriesQuery,
} from 'generated/graphql'
import { Key, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { removeConnection, updateCache } from 'utils/graphql'
import { createMapperWithFallback } from 'utils/mapping'

import { CD_REL_PATH, REPOS_REL_PATH } from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  CD_BASE_CRUMBS,
  POLL_INTERVAL,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { RepoKind, RepoKindSelector } from '../utils/RepoKindSelector'

import { FluxHelmRepositoriesTable } from './FluxHelmRepositoriesTable'
import { ImportGit } from './GitRepositoriesImportGit'
import { GitRepositoriesTable } from './GitRepositoriesTable'
import { HelmRepositoriesTable } from './HelmRepositoriesTable'
import {
  RepositoriesFilters,
  countsFromFluxHelmRepos,
  countsFromGitRepos,
  countsFromHelmRepos,
} from './RepositoriesFilters'

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
  const theme = useTheme()
  const [statusFilterKey, setStatusFilterKey] = useState<Key>('ALL')
  const [filterString, setFilterString] = useState('')

  useSetBreadcrumbs(crumbs)

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

  const fluxQueryResult = useFluxHelmRepositoriesQuery({
    skip: repoKind !== RepoKind.Flux,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const { data, error, refetch } =
    repoKind === RepoKind.Helm
      ? helmQueryResult
      : repoKind === RepoKind.Flux
        ? fluxQueryResult
        : gitQueryResult

  const statusCounts = useMemo(
    () =>
      repoKind === RepoKind.Git
        ? countsFromGitRepos(gitQueryResult?.data)
        : repoKind === RepoKind.Helm
          ? countsFromHelmRepos(helmQueryResult?.data)
          : countsFromFluxHelmRepos(fluxQueryResult?.data),
    [
      gitQueryResult?.data,
      helmQueryResult?.data,
      fluxQueryResult?.data,
      repoKind,
    ]
  )
  const tableOptions = useMemo(
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

  useSetPageHeaderContent(
    useMemo(() => <ImportGit refetch={refetch} />, [refetch])
  )

  if (error) {
    return <GqlError error={error} />
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
      <div css={{ display: 'flex', gap: theme.spacing.medium }}>
        <div>
          <RepoKindSelector
            enableFlux
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
      {repoKind === RepoKind.Git ? (
        <GitRepositoriesTable
          data={data as GitRepositoriesQuery}
          reactTableOptions={tableOptions}
        />
      ) : repoKind === RepoKind.Helm ? (
        <HelmRepositoriesTable
          data={data as HelmRepositoriesQuery}
          reactTableOptions={tableOptions}
        />
      ) : (
        <FluxHelmRepositoriesTable
          data={data as FluxHelmRepositoriesQuery}
          reactTableOptions={tableOptions}
        />
      )}
    </div>
  )
}
