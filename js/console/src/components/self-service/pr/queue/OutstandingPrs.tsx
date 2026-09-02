import { Flex, Input2, SearchIcon, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import { usePullRequestsQuery } from 'generated/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { prColumns } from './PrQueueColumns'

const _PR_STATUS_TAB_KEYS = ['ALL', 'OPEN', 'CLOSED'] as const

type PrStatusTabKey = (typeof _PR_STATUS_TAB_KEYS)[number]

export function OutstandingPrs() {
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
        css={{ flexGrow: 1 }}
      />
      <Table
        virtualizeRows
        fullHeightWrap
        columns={prColumns}
        loading={!data && loading}
        data={data?.pullRequests?.edges || []}
        reactTableOptions={reactTableOptions}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </Flex>
  )
}
