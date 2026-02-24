import { EmptyState, TabPanel } from '@pluralsh/design-system'
import { ReactFlowProvider } from '@xyflow/react'
import { GqlError } from 'components/utils/Alert'
import {
  useGlobalServicesQuery,
  useServiceStatusesQuery,
  useServiceTreeQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { mapExistingNodes } from '../../../utils/graphql'
import { useProjectId } from '../../contexts/ProjectsContext'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { ServicesContextT, getServiceStatuses } from './Services'
import { ServicesFilters, StatusTabKey } from './ServicesFilters'
import { ServicesTreeDiagram } from './ServicesTreeDiagram'

const servicesLimit = 1000

export function ServicesTree() {
  const theme = useTheme()
  const projectId = useProjectId()
  const { setRefetch, clusterId } = useOutletContext<ServicesContextT>()
  const tabStateRef = useRef<any>(null)
  const [queryStatusFilter, setQueryStatusFilter] =
    useState<StatusTabKey>('ALL')

  const { data, loading, error, refetch } = useServiceTreeQuery({
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

  const {
    data: globalServicesData,
    loading: globalServicesLoading,
    error: globalServicesError,
  } = useGlobalServicesQuery({
    variables: { projectId, first: servicesLimit },
  })

  const globalServices = useMemo(
    () => mapExistingNodes(globalServicesData?.globalServices),
    [globalServicesData?.globalServices]
  )

  const { data: serviceStatusesData, error: serviceStatusesError } =
    useServiceStatusesQuery({
      variables: { ...(clusterId ? { clusterId } : {}) },
    })

  const statusCounts = useMemo(
    () => getServiceStatuses(serviceStatusesData?.serviceStatuses),
    [serviceStatusesData?.serviceStatuses]
  )

  useEffect(() => setRefetch?.(() => refetch), [refetch, setRefetch])
  const isLoading =
    (!data && loading) || (!globalServicesData && globalServicesLoading)

  if (error || serviceStatusesError || globalServicesError)
    return (
      <GqlError error={error || serviceStatusesError || globalServicesError} />
    )
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
        hideSearch
        setQueryStatusFilter={setQueryStatusFilter}
        tabStateRef={tabStateRef}
        statusCounts={statusCounts}
      />
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {isLoading ? (
          <RectangleSkeleton
            $height="100%"
            $width="100%"
          />
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
              <EmptyState message="No services match your query." />
            ) : (
              <EmptyState message="Looks like you don't have any services yet." />
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
