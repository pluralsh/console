import { Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { columns } from 'components/cd/services/Services'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ServiceDeploymentsRowFragment,
  useFlowServicesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

export function FlowServices() {
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
    { queryHook: useFlowServicesQuery, keyPath: ['flow', 'services'] },
    { id: flowId ?? '' }
  )
  const reactTableOptions = useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={data?.flow?.services?.edges ?? []}
      columns={columns}
      onRowClick={(_, { original }: Row<Edge<ServiceDeploymentsRowFragment>>) =>
        navigate(
          getServiceDetailsPath({
            clusterId: original.node?.cluster?.id,
            serviceId: original.node?.id,
          })
        )
      }
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      reactTableOptions={reactTableOptions}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}
