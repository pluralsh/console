import { Flex, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { usePullRequestsQuery } from 'generated/graphql'
import { ComponentProps, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useThrottle } from 'components/hooks/useThrottle'
import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

export const columns = [
  ColTitle,
  ColStatus,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]

export function ServicePRs() {
  const { serviceId } = useParams()

  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 200)

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
    { q: debouncedSearchString, serviceId }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (error) return <GqlError error={error} />

  return (
    <ScrollablePage
      scrollable={false}
      heading="Pull requests"
    >
      <Flex
        flexDirection="column"
        gap="medium"
        height="100%"
      >
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          showClearButton
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
          css={{ flexShrink: 0 }}
        />
        <Table
          virtualizeRows
          fullHeightWrap
          columns={columns}
          data={data?.pullRequests?.edges || []}
          loading={!data && loading}
          reactTableOptions={reactTableOptions}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No pull requests found' }}
        />
      </Flex>
    </ScrollablePage>
  )
}
