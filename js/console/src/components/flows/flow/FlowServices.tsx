import { Chip, Flex, Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { columns } from 'components/cd/services/Services'
import {
  BUCKET_SERVICE_STATUSES,
  BUCKET_SEVERITY,
  FLOW_COMPONENT_PARAM,
  parseComponentBucket,
} from 'components/flows/flowHealth'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ServiceDeploymentsRowFragment,
  useFlowServicesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from 'react-router-dom'
import { Edge } from 'utils/graphql'
import type { FlowOutletContext } from './Flow'

export function FlowServices() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { flow } = useOutletContext<FlowOutletContext>()
  const bucket = parseComponentBucket(searchParams.get(FLOW_COMPONENT_PARAM))
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
    { id: flow?.id ?? '' }
  )
  const reactTableOptions = useMemo(() => ({ meta: { refetch } }), [refetch])
  const services = useMemo(() => {
    const edges = data?.flow?.services?.edges ?? []

    if (!bucket) return edges

    const statuses = new Set(BUCKET_SERVICE_STATUSES[bucket])

    return edges.filter(
      (edge) => edge?.node?.status && statuses.has(edge.node.status)
    )
  }, [bucket, data?.flow?.services?.edges])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
      minHeight={0}
    >
      {bucket && (
        <Chip
          size="small"
          closeButton
          fillLevel={1}
          severity={BUCKET_SEVERITY[bucket]}
          css={{ width: 'max-content' }}
          closeButtonProps={{
            onClick: () => {
              const next = new URLSearchParams(searchParams)

              next.delete(FLOW_COMPONENT_PARAM)
              setSearchParams(next)
            },
          }}
        >
          {bucket} services
        </Chip>
      )}
      <Table
        fullHeightWrap
        virtualizeRows
        loading={!data && loading}
        data={services}
        columns={columns}
        onRowClick={(
          _,
          { original }: Row<Edge<ServiceDeploymentsRowFragment>>
        ) => navigate(original.node?.id ?? '')}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{
          message: bucket
            ? `No ${bucket} services found.`
            : 'No services found',
        }}
      />
    </Flex>
  )
}
