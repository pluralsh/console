import { Flex, TabPanel, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

import { Link, useOutletContext } from 'react-router-dom'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { useProjectId } from '../../contexts/ProjectsContext'

import { ServicesContextT, columns, getServiceStatuses } from './Services'
import { ServicesFilters, StatusTabKey } from './ServicesFilters'

export default function ServicesTable() {
  const projectId = useProjectId()
  const { setRefetch, clusterId, q } = useOutletContext<ServicesContextT>()
  const tabStateRef = useRef<any>(null)
  const [queryStatusFilter, setQueryStatusFilter] =
    useState<StatusTabKey>('ALL')

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useServiceDeploymentsQuery, keyPath: ['serviceDeployments'] },
    {
      q: q || undefined,
      projectId,
      ...(clusterId ? { clusterId } : {}),
      ...(queryStatusFilter !== 'ALL' ? { status: queryStatusFilter } : {}),
    }
  )

  const statusCounts = useMemo(
    () => getServiceStatuses(data?.serviceStatuses),
    [data?.serviceStatuses]
  )

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <ServicesFilters
        setQueryStatusFilter={setQueryStatusFilter}
        tabStateRef={tabStateRef}
        statusCounts={statusCounts}
      />
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        <Table
          fullHeightWrap
          virtualizeRows
          loading={!data && loading}
          data={data?.serviceDeployments?.edges || []}
          columns={columns}
          getRowLink={({ original }) => {
            const { node } = original as Edge<ServiceDeploymentsRowFragment>
            return (
              <Link
                to={getServiceDetailsPath({
                  clusterId: node?.cluster?.id,
                  serviceId: node?.id,
                })}
              />
            )
          }}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          reactTableOptions={reactTableOptions}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{
            message:
              statusCounts.ALL || 0 > 0
                ? 'No service deployments match your query.'
                : "Looks like you don't have any service deployments yet.",
          }}
        />
      </TabPanel>
    </Flex>
  )
}
