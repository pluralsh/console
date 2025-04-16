import { useTheme } from 'styled-components'
import { Input, LoopingLogo, SearchIcon, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColService,
  ColStatus,
  ColTitle,
} from '../../pr/queue/PrQueueColumns'
import { GqlError } from '../../utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'
import { usePullRequestsQuery } from '../../../generated/graphql'
import { useThrottle } from '../../hooks/useThrottle'

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

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

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
      <div css={{ display: 'flex', minWidth: 0, gap: theme.spacing.medium }}>
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
        columns={columns}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        data={data?.pullRequests?.edges || []}
        virtualizeRows
        reactTableOptions={reactTableOptions}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </div>
  )
}
