import { Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { columns } from 'components/cd/pipelines/PipelinesColumns'

import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { PipelineFragment, useFlowPipelinesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

export function FlowPipelines() {
  const navigate = useNavigate()
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
    { queryHook: useFlowPipelinesQuery, keyPath: ['flow', 'pipelines'] },
    { id: flowId ?? '' }
  )
  const reactTableOptions = useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={data?.flow?.pipelines?.edges ?? []}
      columns={columns}
      onRowClick={(_, { original }: Row<Edge<PipelineFragment>>) =>
        navigate(`${PIPELINES_ABS_PATH}/${original.node?.id}`)
      }
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      reactTableOptions={reactTableOptions}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}
