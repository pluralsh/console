import { Card, EmptyState, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useWorkbenchMonitorQuery } from 'generated/graphql'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  WORKBENCH_MONITORING_DASHBOARD_PARAM_ID,
  WORKBENCH_MONITORING_MONITOR_PARAM_ID,
  WORKBENCHES_CREATE_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  DashboardDetail,
  MonitoringDetailSkeleton,
} from './WorkbenchDashboardDetail'
import { WorkbenchMonitoringBuild } from './WorkbenchMonitoringBuild'
import { WorkbenchMonitoringSidebar } from './WorkbenchMonitoringSidebar'

export function WorkbenchMonitoring() {
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()
  const params = useParams()
  const dashboardId = params[WORKBENCH_MONITORING_DASHBOARD_PARAM_ID]
  const monitorId = params[WORKBENCH_MONITORING_MONITOR_PARAM_ID]

  // Tab strip height matches the sidebar filter row:
  // 2x16 padding + 32 input + 1 border.
  return (
    <WorkbenchPageLayout
      contentBackground="fill-accent"
      tabStripBackground="fill-zero-selected"
      tabStripHeight={65}
      sidebar={{
        kind: 'custom',
        content: <WorkbenchMonitoringSidebar workbenchId={workbenchId} />,
      }}
    >
      <DetailSC>
        {dashboardId ? (
          dashboardId === WORKBENCHES_CREATE_REL_PATH ? (
            <WorkbenchMonitoringBuild
              workbenchId={workbenchId}
              workbenchLoading={isLoading}
              kind="dashboard"
            />
          ) : (
            <DashboardDetail
              key={dashboardId}
              dashboardId={dashboardId}
            />
          )
        ) : monitorId ? (
          monitorId === WORKBENCHES_CREATE_REL_PATH ? (
            <WorkbenchMonitoringBuild
              workbenchId={workbenchId}
              workbenchLoading={isLoading}
              kind="monitor"
            />
          ) : (
            <MonitorDetail
              key={monitorId}
              monitorId={monitorId}
            />
          )
        ) : (
          <Card css={{ padding: 24 }}>
            <EmptyState message="Select a dashboard or monitor to view details." />
          </Card>
        )}
      </DetailSC>
    </WorkbenchPageLayout>
  )
}

function MonitorDetail({ monitorId }: { monitorId: string }) {
  const { data, loading, error } = useWorkbenchMonitorQuery({
    variables: { id: monitorId },
    fetchPolicy: 'cache-and-network',
  })

  if (loading) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  const monitor = data?.monitor
  if (!monitor) return <EmptyState message="Monitor not found." />

  return (
    <MonitorDetailView
      name={monitor.name}
      description={monitor.description}
    />
  )
}

function MonitorDetailView({
  name,
  description,
}: {
  name: string
  description: Nullable<string>
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <h2>{name}</h2>
      {description && <p>{description}</p>}
      <Card css={{ padding: 24 }}>
        <EmptyState message="Monitor details are coming soon." />
      </Card>
    </Flex>
  )
}

const DetailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))
