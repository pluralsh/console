import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import { CD_REL_PATH, REPOS_REL_PATH } from 'routes/cdRoutesConsts'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { RepoKind, RepoKindSelector } from '../utils/RepoKindSelector'

import { FluxHelmRepositoriesTable } from './FluxHelmRepositoriesTable'
import { ImportGit } from './GitRepositoriesImportGit'
import { GitRepositoriesTable } from './GitRepositoriesTable'
import { HelmRepositoriesTable } from './HelmRepositoriesTable'
import {
  EMPTY_REPO_STATUS_COUNTS,
  RepoStatusFilterKey,
  RepositoriesFilters,
} from './RepositoriesFilters'

const crumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'repositories', url: `/${CD_REL_PATH}/${REPOS_REL_PATH}` },
]

export function Repositories() {
  const [repoKind, setRepoKind] = useState(RepoKind.Git)
  const [statusFilterKey, setStatusFilterKey] = useState<RepoStatusFilterKey>(
    RepoStatusFilterKey.All
  )
  const [filterString, setFilterString] = useState('')

  const [statusCounts, setStatusCounts] = useState<
    Record<RepoStatusFilterKey, number>
  >(EMPTY_REPO_STATUS_COUNTS)
  useSetBreadcrumbs(crumbs)

  const tableOptions = useMemo(
    () => ({
      state: {
        globalFilter: filterString,
        columnFilters: [
          ...(statusFilterKey !== 'ALL'
            ? [{ id: 'status', value: statusFilterKey }]
            : []),
        ],
      },
    }),
    [filterString, statusFilterKey]
  )

  useSetPageHeaderContent(useMemo(() => <ImportGit />, []))

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Flex gap="medium">
        <RepoKindSelector
          enableFlux
          onKindChange={setRepoKind}
          selectedKind={repoKind}
        />
        <RepositoriesFilters
          statusCounts={statusCounts}
          statusFilterKey={statusFilterKey}
          setStatusFilterKey={setStatusFilterKey}
          setFilterString={setFilterString}
        />
      </Flex>
      {repoKind === RepoKind.Git ? (
        <GitRepositoriesTable
          setStatusCounts={setStatusCounts}
          tableFilterOptions={tableOptions}
        />
      ) : repoKind === RepoKind.Helm ? (
        <HelmRepositoriesTable
          setStatusCounts={setStatusCounts}
          tableFilterOptions={tableOptions}
        />
      ) : (
        <FluxHelmRepositoriesTable
          setStatusCounts={setStatusCounts}
          tableFilterOptions={tableOptions}
        />
      )}
    </Flex>
  )
}
