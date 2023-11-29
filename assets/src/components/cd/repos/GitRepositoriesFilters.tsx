import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import { Key, useEffect, useMemo, useRef, useState } from 'react'
import { type TableState } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'
import { GitHealth, useGitRepositoriesQuery } from 'generated/graphql'

import { gitHealthToLabel, gitHealthToSeverity } from './GitHealthChip'

type StatusTabKey = GitHealth | 'ALL'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  [GitHealth.Pullable]: { label: gitHealthToLabel(GitHealth.Pullable) },
  [GitHealth.Failed]: { label: gitHealthToLabel(GitHealth.Failed) },
} as const satisfies Record<StatusTabKey, { label: string }>)

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

export function GitRepositoriesFilters({
  data,
  setTableFilters,
}: {
  data: ReturnType<typeof useGitRepositoriesQuery>['data']
  setTableFilters: (
    filters: Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  ) => void
}) {
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)
  const [statusFilterKey, setStatusTabKey] = useState<Key>('ALL')
  const counts = useMemo(() => {
    const c: Record<string, number | undefined> = {
      ALL: data?.gitRepositories?.edges?.length,
    }

    data?.gitRepositories?.edges?.forEach((edge) => {
      if (edge?.node?.health) {
        c[edge?.node?.health] = (c[edge?.node?.health] ?? 0) + 1
      }
    })

    return c
  }, [data?.gitRepositories?.edges])

  const tableFilters: Partial<
    Pick<TableState, 'globalFilter' | 'columnFilters'>
  > = useMemo(
    () => ({
      globalFilter: debouncedFilterString,
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
    }),
    [debouncedFilterString, statusFilterKey]
  )

  useEffect(() => {
    setTableFilters(tableFilters)
  }, [setTableFilters, tableFilters])

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
            setStatusTabKey(key)
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
              {counts[key] ?? 0}
            </Chip>
          </SubTab>
        ))}
      </TabList>
    </GitRepositoryFiltersSC>
  )
}
