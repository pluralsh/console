import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import {
  FluxHelmRepositoryFragment,
  GitHealth,
  GitRepositoryFragment,
  HelmRepositoryFragment,
} from 'generated/graphql'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { capitalize, countBy } from 'lodash'
import { Edge } from 'utils/graphql'
import { gitHealthToSeverity } from './GitHealthChip'

export const RepoStatusFilterKey = {
  All: 'ALL',
  Pullable: 'PULLABLE',
  Failed: 'FAILED',
} as const
export type RepoStatusFilterKey =
  (typeof RepoStatusFilterKey)[keyof typeof RepoStatusFilterKey]

export const EMPTY_REPO_STATUS_COUNTS: Record<RepoStatusFilterKey, number> = {
  ALL: 0,
  PULLABLE: 0,
  FAILED: 0,
}

const GitRepositoryFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.medium,
  flexGrow: 1,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export const countsFromGitOrHelmRepos = (
  data: Nullable<Edge<GitRepositoryFragment | HelmRepositoryFragment>>[]
): Record<RepoStatusFilterKey, number> => ({
  ...EMPTY_REPO_STATUS_COUNTS,
  ALL: data.length,
  ...countBy(data, (edge) => edge?.node?.health),
})

export function countsFromFluxHelmRepos(data: FluxHelmRepositoryFragment[]) {
  const c: Record<RepoStatusFilterKey, number> = {
    ...EMPTY_REPO_STATUS_COUNTS,
    ALL: data.length,
  }
  data.forEach((repo) => {
    if (repo?.status?.ready) ++c[RepoStatusFilterKey.Pullable]
    else ++c[RepoStatusFilterKey.Failed]
  })
  return c
}

export function RepositoriesFilters({
  statusCounts,
  statusFilterKey,
  setStatusFilterKey,
  setFilterString: setFilterStringProp,
}: {
  statusCounts: Record<RepoStatusFilterKey, number>
  statusFilterKey: RepoStatusFilterKey
  setStatusFilterKey: (key: RepoStatusFilterKey) => void
  setFilterString: (filterString: string) => void
}) {
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  useEffect(() => {
    setFilterStringProp(debouncedFilterString)
  }, [debouncedFilterString, setFilterStringProp])
  useEffect(() => {
    setStatusFilterKey(statusFilterKey)
  }, [statusFilterKey, setStatusFilterKey])

  return (
    <GitRepositoryFiltersSC>
      <Input
        placeholder="Search"
        startIcon={
          <SearchIcon
            border={undefined}
            size={undefined}
          />
        }
        value={filterString}
        onChange={(e) => setFilterString(e.currentTarget.value)}
        css={{ flexGrow: 1 }}
      />
      <TabList
        scrollable
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: statusFilterKey,
          onSelectionChange: (key) =>
            setStatusFilterKey(key as RepoStatusFilterKey),
        }}
      >
        {Object.values(RepoStatusFilterKey).map((key) => (
          <SubTab
            key={key}
            textValue={capitalize(key)}
            className="statusTab"
          >
            {capitalize(key)}
            <Chip
              size="small"
              severity={gitHealthToSeverity(key as GitHealth)}
            >
              {statusCounts[key] ?? 0}
            </Chip>
          </SubTab>
        ))}
      </TabList>
    </GitRepositoryFiltersSC>
  )
}
