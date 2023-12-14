import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useDebounce } from '@react-hooks-library/core'
import { type VirtualItem } from '@tanstack/react-virtual'
import {
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { POLL_INTERVAL } from '../ContinuousDeployment'

import { ServicesFilters, StatusTabKey } from './ServicesFilters'
import {
  SERVICES_QUERY_PAGE_SIZE,
  SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from './Services'

export function ServicesTable({
  setRefetch,
  clusterId: clusterIdProp,
}: {
  setRefetch?: (refetch: () => () => void) => void
  clusterId?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [clusterIdInternal, setClusterId] = useState<string>('')
  const clusterId = clusterIdProp ?? clusterIdInternal
  const [searchString, setSearchString] = useState()
  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)
  const [statusFilter, setStatusFilter] = useState<StatusTabKey>('ALL')
  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  const queryResult = useServiceDeploymentsQuery({
    variables: {
      ...(clusterId ? { clusterId } : {}),
      q: debouncedSearchString,
      first: SERVICES_QUERY_PAGE_SIZE,
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const serviceDeployments = data?.serviceDeployments
  const pageInfo = serviceDeployments?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: SERVICES_QUERY_PAGE_SIZE,
    key: 'serviceDeployments',
    interval: POLL_INTERVAL,
  })
  const statusCounts = useMemo<Record<StatusTabKey, number | undefined>>(
    () => ({
      ALL: data?.serviceStatuses?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      HEALTHY: data?.serviceStatuses ? 0 : undefined,
      SYNCED: data?.serviceStatuses ? 0 : undefined,
      STALE: data?.serviceStatuses ? 0 : undefined,
      FAILED: data?.serviceStatuses ? 0 : undefined,
      ...Object.fromEntries(
        data?.serviceStatuses?.map((status) => [
          status?.status,
          status?.count,
        ]) || []
      ),
    }),
    [data?.serviceStatuses]
  )

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        meta: {
          refetch,
        },
      }),
      [refetch]
    )

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.serviceDeployments,
          'serviceDeployments'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <ServicesFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchString={searchString}
        setSearchString={setSearchString}
        clusterId={clusterId}
        setClusterId={clusterIdProp ? undefined : setClusterId}
        tabStateRef={tabStateRef}
        statusCounts={statusCounts}
      />
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : !isEmpty(data?.serviceDeployments?.edges) ? (
          <FullHeightTableWrap>
            <Table
              virtualizeRows
              data={data?.serviceDeployments?.edges || []}
              columns={columns}
              css={{
                maxHeight: 'unset',
                height: '100%',
              }}
              onRowClick={(
                _e,
                { original }: Row<Edge<ServiceDeploymentsRowFragment>>
              ) =>
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
              reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
              onVirtualSliceChange={setVirtualSlice}
            />
          </FullHeightTableWrap>
        ) : (
          <div css={{ height: '100%' }}>
            {statusCounts.ALL || 0 > 0 ? (
              <EmptyState message="No service deployments match your query." />
            ) : (
              <EmptyState message="Looks like you don't have any service deployments yet." />
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
