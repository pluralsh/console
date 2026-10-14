import { Chip, SubTab, TabList } from '@pluralsh/design-system'
import {
  FluxHelmRepositoryFragment,
  GitHealth,
  PullabilityStatistic,
} from 'generated/graphql'
import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { capitalize } from 'lodash'
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
  stats: Nullable<PullabilityStatistic>[] | null | undefined
): Record<RepoStatusFilterKey, number> => {
  const counts: Record<RepoStatusFilterKey, number> = {
    ...EMPTY_REPO_STATUS_COUNTS,
  }
  if (!stats) return counts

  let total = 0

  stats.forEach((stat) => {
    if (!stat) return
    if (stat.health) {
      counts[stat.health as RepoStatusFilterKey] = stat.count
    }
    total += stat.count
  })

  counts.ALL = total

  return counts
}

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
}: {
  statusCounts: Record<RepoStatusFilterKey, number>
  statusFilterKey: RepoStatusFilterKey
  setStatusFilterKey: (key: RepoStatusFilterKey) => void
}) {
  const tabStateRef = useRef<any>(null)

  useEffect(() => {
    setStatusFilterKey(statusFilterKey)
  }, [statusFilterKey, setStatusFilterKey])

  return (
    <GitRepositoryFiltersSC>
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
            size="small"
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
