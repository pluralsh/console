import { useTheme } from 'styled-components'
import { Input, LoopingLogo, SearchIcon, Table } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColService,
  ColStatus,
  ColTitle,
} from '../../pr/queue/PrQueueColumns'
import {
  PRS_REACT_VIRTUAL_OPTIONS,
  PR_QUERY_PAGE_SIZE,
} from '../../pr/queue/PrQueue'
import { GqlError } from '../../utils/Alert'
import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'
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
    {
      queryHook: usePullRequestsQuery,
      pageSize: PR_QUERY_PAGE_SIZE,
      keyPath: ['pullRequests'],
    },
    {
      q: debouncedSearchString,
      clusterId: cluster.id,
    }
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
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
          data={data?.pullRequests?.edges || []}
          virtualizeRows
          reactTableOptions={reactTableOptions}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
