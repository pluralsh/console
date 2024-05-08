import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useDebounce } from '@react-hooks-library/core'
import {
  ServiceDeploymentStatus,
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

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
      queryHook: useServiceDeploymentsQuery,
      pageSize: SERVICES_QUERY_PAGE_SIZE,
      queryKey: 'serviceDeployments',
    },
    {
      q: debouncedSearchString,
      ...(clusterId ? { clusterId } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }
  )

  const statusCounts = useMemo<Record<StatusTabKey, number | undefined>>(
    () => ({
      ALL: data?.serviceStatuses?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      [ServiceDeploymentStatus.Healthy]: data?.serviceStatuses ? 0 : undefined,
      [ServiceDeploymentStatus.Synced]: data?.serviceStatuses ? 0 : undefined,
      [ServiceDeploymentStatus.Stale]: data?.serviceStatuses ? 0 : undefined,
      [ServiceDeploymentStatus.Paused]: data?.serviceStatuses ? 0 : undefined,
      [ServiceDeploymentStatus.Failed]: data?.serviceStatuses ? 0 : undefined,
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
