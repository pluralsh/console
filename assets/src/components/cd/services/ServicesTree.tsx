import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import {
  ServiceDeploymentStatus,
  useServiceDeploymentsQuery,
} from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { ReactFlowProvider } from 'reactflow'

import { useProjectId } from '../../contexts/ProjectsContext'

import { mapExistingNodes } from '../../../utils/graphql'

import { ServicesFilters, StatusTabKey } from './ServicesFilters'
import { SERVICES_QUERY_PAGE_SIZE } from './Services'
import { ServicesTreeDiagram } from './ServicesTreeDiagram'

function ServicesTreeComponent({
  setRefetch,
  clusterId: clusterIdProp,
}: {
  setRefetch?: (refetch: () => () => void) => void
  clusterId?: string
}) {
  const theme = useTheme()
  const projectId = useProjectId()
  const [clusterIdInternal, setClusterId] = useState<string>('')
  const clusterId = clusterIdProp ?? clusterIdInternal
  const tabStateRef = useRef<any>(null)
  const [queryString, setQueryString] = useState()
  const [queryStatusFilter, setQueryStatusFilter] =
    useState<StatusTabKey>('ALL')

  const { data, error, refetch } = useServiceDeploymentsQuery({
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      q: queryString,
      projectId,
      ...(clusterId ? { clusterId } : {}),
      ...(queryStatusFilter !== 'ALL' ? { status: queryStatusFilter } : {}),
    },
  })

  const services = useMemo(
    () => mapExistingNodes(data?.serviceDeployments),
    [data?.serviceDeployments?.edges]
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
        setQueryStatusFilter={setQueryStatusFilter}
        setQueryString={setQueryString}
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
          <ReactFlowProvider>
            <ServicesTreeDiagram services={services} />
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

export const ServicesTree = memo(ServicesTreeComponent)
