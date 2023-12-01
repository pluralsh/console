import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import { Key, useEffect, useRef, useState } from 'react'
import { useDebounce } from '@react-hooks-library/core'
import {
  GitHealth,
  useGitRepositoriesQuery,
  useHelmRepositoriesQuery,
} from 'generated/graphql'

import { gitHealthToLabel, gitHealthToSeverity } from './GitHealthChip'

export type StatusFilterKey = GitHealth | 'ALL'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  [GitHealth.Pullable]: { label: gitHealthToLabel(GitHealth.Pullable) },
  [GitHealth.Failed]: { label: gitHealthToLabel(GitHealth.Failed) },
} as const satisfies Record<StatusFilterKey, { label: string }>)

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

export function countsFromGitRepos(
  data: ReturnType<typeof useGitRepositoriesQuery>['data']
) {
  const c: Record<string, number | undefined> = {
    ALL: data?.gitRepositories?.edges?.length,
  }

  data?.gitRepositories?.edges?.forEach((edge) => {
    if (edge?.node?.health) {
      c[edge?.node?.health] = (c[edge?.node?.health] ?? 0) + 1
    }
  })

  return c
}

export function countsFromHelmRepos(
  data: ReturnType<typeof useHelmRepositoriesQuery>['data']
) {
  const c: Record<string, number | undefined> = {
    ALL: data?.helmRepositories?.length,
  }

  data?.helmRepositories?.forEach((repo) => {
    if (repo?.status?.ready) {
      c[GitHealth.Pullable] = (c[GitHealth.Pullable] ?? 0) + 1
    } else {
      c[GitHealth.Failed] = (c[GitHealth.Failed] ?? 0) + 1
    }
  })

  return c
}

export function RepositoriesFilters({
  statusCounts,
  statusFilterKey,
  setStatusFilterKey,
  setFilterString: setFilterStringProp,
}: {
  statusCounts: any
  statusFilterKey: Key
  setStatusFilterKey: (key: Key) => void
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
        onChange={(e) => {
          setFilterString(e.currentTarget.value)
        }}
        css={{ flexGrow: 1 }}
      />
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: statusFilterKey,
          onSelectionChange: (key) => {
            setStatusFilterKey(key)
          },
        }}
      >
        {statusTabs.map(([key, { label }]) => (
          <SubTab
            key={key}
            textValue={label}
            className="statusTab"
          >
            {label}
            <Chip
              size="small"
              severity={gitHealthToSeverity(key as any)}
            >
              {statusCounts[key] ?? 0}
            </Chip>
          </SubTab>
        ))}
      </TabList>
    </GitRepositoryFiltersSC>
  )
}
