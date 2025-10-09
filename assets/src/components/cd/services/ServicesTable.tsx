import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'

import { useOutletContext } from 'react-router-dom'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { useProjectId } from '../../contexts/ProjectsContext'

import { ServicesContextT, columns, getServiceStatuses } from './Services'
import { ServicesFilters, StatusTabKey } from './ServicesFilters'

export default function ServicesTable() {
  const theme = useTheme()
  const navigate = useNavigate()
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
      q,
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
  if (!data) return <LoadingIndicator />

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
        setQueryStatusFilter={setQueryStatusFilter}
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
          <Table
            fullHeightWrap
            virtualizeRows
            data={data?.serviceDeployments?.edges || []}
            columns={columns}
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
            onVirtualSliceChange={setVirtualSlice}
          />
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
