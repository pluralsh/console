import { Input, SearchIcon, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'

import { usePullRequestsQuery } from 'generated/graphql'
import { useThrottle } from 'components/hooks/useThrottle'
import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColService,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { useClusterContext } from './Cluster'

export const columns = [
  ColTitle,
  ColStatus,
  ColService,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]

export default function ClusterPRs() {
  const { cluster } = useClusterContext()
  const theme = useTheme()
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
    { q: debouncedSearchString, clusterId: cluster.id }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
        width: '100%',
      }}
    >
      {error ? (
        <GqlError error={error} />
      ) : (
        <>
          <div
            css={{ display: 'flex', minWidth: 0, gap: theme.spacing.medium }}
          >
            <Input
              placeholder="Search"
              startIcon={<SearchIcon />}
              showClearButton
              value={searchString}
              onChange={(e) => setSearchString(e.currentTarget.value)}
              css={{ flexGrow: 1 }}
            />
          </div>
          <Table
            fullHeightWrap
            virtualizeRows
            columns={columns}
            data={data?.pullRequests?.edges || []}
            loading={!data && loading}
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            reactTableOptions={reactTableOptions}
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
          />
        </>
      )}
    </div>
  )
}
