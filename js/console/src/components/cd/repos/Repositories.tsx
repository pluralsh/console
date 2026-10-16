import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { useMemo, useState } from 'react'

import { ToolbarSearchInput } from 'components/layout/PageToolbar'

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
  const debouncedFilterString = useDebounce(filterString, 100)

  const [statusCounts, setStatusCounts] = useState<
    Record<RepoStatusFilterKey, number>
  >(EMPTY_REPO_STATUS_COUNTS)

  useSetBreadcrumbs(crumbs)
  useSetPageHeaderContent(
    useMemo(
      () => (
        <>
          <ToolbarSearchInput
            placeholder="Search repositories"
            value={filterString}
            onChange={setFilterString}
          />
          <ImportGit />
        </>
      ),
      [filterString]
    )
  )

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Flex
        gap="medium"
        align="center"
      >
        <RepoKindSelector
          enableFlux
          size="small"
          onKindChange={setRepoKind}
          selectedKind={repoKind}
        />
        <RepositoriesFilters
          statusCounts={statusCounts}
          statusFilterKey={statusFilterKey}
          setStatusFilterKey={setStatusFilterKey}
        />
      </Flex>
      {repoKind === RepoKind.Git ? (
        <GitRepositoriesTable
          status={statusFilterKey}
          searchStr={debouncedFilterString}
          setStatusCounts={setStatusCounts}
        />
      ) : repoKind === RepoKind.Helm ? (
        <HelmRepositoriesTable
          status={statusFilterKey}
          searchStr={debouncedFilterString}
          setStatusCounts={setStatusCounts}
        />
      ) : (
        <FluxHelmRepositoriesTable
          status={statusFilterKey}
          searchStr={debouncedFilterString}
          setStatusCounts={setStatusCounts}
        />
      )}
    </Flex>
  )
}
