import { Flex, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import {
  PullRequestsDocument,
  PullRequestsQuery,
  PullRequestsQueryVariables,
} from 'generated/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import {
  PageToolbarPortal,
  ToolbarSearchInput,
} from 'components/layout/PageToolbar'
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
  } = useFetchPaginatedData<PullRequestsQuery, PullRequestsQueryVariables>(
    { query: PullRequestsDocument, keyPath: ['pullRequests'] },
    { q: debouncedSearchString }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  return (
    <>
      <PageToolbarPortal>
        <ToolbarSearchInput
          placeholder="Search PRs"
          value={searchString}
          onChange={setSearchString}
        />
      </PageToolbarPortal>
      {error ? (
        <GqlError error={error} />
      ) : (
        <Flex
          direction="column"
          height="100%"
          overflow="hidden"
        >
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
      )}
    </>
  )
}
