import { Flex, Input2, SearchIcon, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import { usePullRequestsQuery } from 'generated/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { prColumns } from './PrQueueColumns'
import { useTheme } from 'styled-components'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PR_STATUS_TAB_KEYS = ['ALL', 'OPEN', 'CLOSED'] as const

type PrStatusTabKey = (typeof PR_STATUS_TAB_KEYS)[number]

export function OutstandingPrs() {
  const { colors } = useTheme()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 200)
  const [_statusFilter, _setStatusFilter] = useState<PrStatusTabKey>()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: usePullRequestsQuery, keyPath: ['pullRequests'] },
    { q: debouncedSearchString }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
      overflow="hidden"
    >
      <Input2
        placeholder="Search PRs"
        startIcon={<SearchIcon />}
        showClearButton
        value={searchString}
        onChange={(e) => setSearchString(e.currentTarget.value)}
        css={{ flexGrow: 1, background: colors['fill-one'] }}
      />
      <Table
        virtualizeRows
        fullHeightWrap
        columns={prColumns}
        loading={!data && loading}
        data={data?.pullRequests?.edges || []}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        reactTableOptions={reactTableOptions}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </Flex>
  )
}
