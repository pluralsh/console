import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import {
  ServiceDeploymentStatus,
  useGlobalServicesQuery,
  useServiceStatusesQuery,
  useServiceTreeQuery,
} from 'generated/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { ReactFlowProvider } from 'reactflow'
import { useOutletContext } from 'react-router-dom'

import { useProjectId } from '../../contexts/ProjectsContext'
import { mapExistingNodes } from '../../../utils/graphql'

import { ServicesFilters, StatusTabKey } from './ServicesFilters'
import { ServicesTreeDiagram } from './ServicesTreeDiagram'
import { ServicesContextT } from './Services'

const servicesLimit = 1000

export default function ServicesTree() {
  const theme = useTheme()
  const projectId = useProjectId()
  const [clusterIdInternal, setClusterId] = useState<string>('')
  const { setRefetch, clusterId: clusterIdProp } =
    useOutletContext<ServicesContextT>()
  const clusterId = clusterIdProp ?? clusterIdInternal
  const tabStateRef = useRef<any>(null)
  const [queryStatusFilter, setQueryStatusFilter] =
    useState<StatusTabKey>('ALL')

  const { data, error, refetch } = useServiceTreeQuery({
    variables: {
      projectId,
      ...(clusterId ? { clusterId } : {}),
      ...(queryStatusFilter !== 'ALL' ? { status: queryStatusFilter } : {}),
      first: servicesLimit,
    },
  })

  const services = useMemo(
    () => mapExistingNodes(data?.serviceTree),
    [data?.serviceTree]
  )

  const { data: serviceStatusesData, error: serviceStatusesError } =
    useServiceStatusesQuery({
      variables: { ...(clusterId ? { clusterId } : {}) },
    })

  const { data: globalServicesData, error: globalServicesError } =
    useGlobalServicesQuery({
      variables: { projectId, first: servicesLimit },
    })

  const globalServices = useMemo(
    () => mapExistingNodes(globalServicesData?.globalServices),
    [globalServicesData?.globalServices]
  )

  const statusCounts = useMemo<Record<StatusTabKey, number | undefined>>(
    () => ({
      ALL: serviceStatusesData?.serviceStatuses?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      [ServiceDeploymentStatus.Healthy]: serviceStatusesData?.serviceStatuses
        ? 0
        : undefined,
      [ServiceDeploymentStatus.Synced]: serviceStatusesData?.serviceStatuses
        ? 0
        : undefined,
      [ServiceDeploymentStatus.Stale]: serviceStatusesData?.serviceStatuses
        ? 0
        : undefined,
      [ServiceDeploymentStatus.Paused]: serviceStatusesData?.serviceStatuses
        ? 0
        : undefined,
      [ServiceDeploymentStatus.Failed]: serviceStatusesData?.serviceStatuses
        ? 0
        : undefined,
      ...Object.fromEntries(
        serviceStatusesData?.serviceStatuses?.map((status) => [
          status?.status,
          status?.count,
        ]) || []
      ),
    }),
    [serviceStatusesData?.serviceStatuses]
  )

  useEffect(() => setRefetch?.(() => refetch), [refetch, setRefetch])

  if (error) return <GqlError error={error} />

  if (serviceStatusesError) return <GqlError error={serviceStatusesError} />

  if (globalServicesError) return <GqlError error={globalServicesError} />

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
        clusterId={clusterId}
        setClusterId={clusterIdProp ? undefined : setClusterId}
        tabStateRef={tabStateRef}
        statusCounts={statusCounts}
      />
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data || !globalServicesData ? (
          <LoadingIndicator />
        ) : !isEmpty(services) ? (
          <ReactFlowProvider>
            <ServicesTreeDiagram
              services={services}
              globalServices={globalServices}
            />
          </ReactFlowProvider>
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
