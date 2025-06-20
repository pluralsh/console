import { Table } from '@pluralsh/design-system'
import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'

import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useFlowPrsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

export function FlowPrs() {
  const { flowId } = useParams()
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useFlowPrsQuery, keyPath: ['flow', 'pullRequests'] },
    { id: flowId ?? '' }
  )
  const reactTableOptions = useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={data?.flow?.pullRequests?.edges ?? []}
      columns={columns}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      reactTableOptions={reactTableOptions}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}

const columns = [ColTitle, ColStatus, ColCreator, ColInsertedAt, ColActions]
