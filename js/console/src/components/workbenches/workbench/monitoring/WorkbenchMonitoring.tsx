import { Card, EmptyState } from '@pluralsh/design-system'
import {
  useWorkbenchMonitoringDashboardQuery,
  useWorkbenchMonitorQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  WORKBENCH_MONITORING_DASHBOARD_PARAM_ID,
  WORKBENCH_MONITORING_MONITOR_PARAM_ID,
  WORKBENCHES_CREATE_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import { DashboardDetail } from './WorkbenchDashboardDetail'
import { MonitorDetail } from './WorkbenchMonitorDetail'
import { WorkbenchMonitoringBuild } from './WorkbenchMonitoringBuild'
import { WorkbenchMonitoringSidebar } from './WorkbenchMonitoringSidebar'
import {
  WorkbenchMonitoringUpdateButton,
  WorkbenchMonitoringUpdatePanel,
} from './WorkbenchMonitoringUpdatePanel'

export function WorkbenchMonitoring() {
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()
  const params = useParams()
  const dashboardId = params[WORKBENCH_MONITORING_DASHBOARD_PARAM_ID]
  const monitorId = params[WORKBENCH_MONITORING_MONITOR_PARAM_ID]
  const isDashboardCreate = dashboardId === WORKBENCHES_CREATE_REL_PATH
  const isMonitorCreate = monitorId === WORKBENCHES_CREATE_REL_PATH
  const [updateOpen, setUpdateOpen] = useState(false)

  const { data: dashboardData } = useWorkbenchMonitoringDashboardQuery({
    variables: { id: dashboardId ?? '' },
    skip: !dashboardId || isDashboardCreate,
  })
  const { data: monitorData } = useWorkbenchMonitorQuery({
    variables: { id: monitorId ?? '' },
    skip: !monitorId || isMonitorCreate,
  })

  const updateTarget = useMemo(() => {
    if (dashboardId && !isDashboardCreate) {
      const name = dashboardData?.workbenchDashboard?.name
      if (!name) return null
      return { kind: 'dashboard' as const, id: dashboardId, name }
    }
    if (monitorId && !isMonitorCreate) {
      const name = monitorData?.monitor?.name
      if (!name) return null
      return { kind: 'monitor' as const, id: monitorId, name }
    }
    return null
  }, [
    dashboardData?.workbenchDashboard?.name,
    dashboardId,
    isDashboardCreate,
    isMonitorCreate,
    monitorData?.monitor?.name,
    monitorId,
  ])

  // Tab strip height matches the sidebar filter row:
  // 2x16 padding + 32 input + 1 border.
  return (
    <WorkbenchPageLayout
      contentBackground="fill-accent"
      tabStripBackground="fill-zero-selected"
      tabStripHeight={65}
      showEditWorkbenchButton={!updateTarget}
      sidebar={{
        kind: 'custom',
        content: <WorkbenchMonitoringSidebar workbenchId={workbenchId} />,
      }}
      headerActions={
        updateTarget ? (
          <WorkbenchMonitoringUpdateButton
            kind={updateTarget.kind}
            name={updateTarget.name}
            onClick={() => setUpdateOpen(true)}
          />
        ) : undefined
      }
    >
      <DetailSC>
        {dashboardId ? (
          isDashboardCreate ? (
            <PaddedSC>
              <WorkbenchMonitoringBuild
                workbenchId={workbenchId}
                workbenchLoading={isLoading}
                kind="dashboard"
              />
            </PaddedSC>
          ) : (
            <DashboardDetail
              key={dashboardId}
              dashboardId={dashboardId}
            />
          )
        ) : monitorId ? (
          isMonitorCreate ? (
            <PaddedSC>
              <WorkbenchMonitoringBuild
                workbenchId={workbenchId}
                workbenchLoading={isLoading}
                kind="monitor"
              />
            </PaddedSC>
          ) : (
            <MonitorDetail
              key={monitorId}
              monitorId={monitorId}
            />
          )
        ) : (
          <PaddedSC>
            <Card css={{ padding: 24 }}>
              <EmptyState message="Select a dashboard or monitor to view details." />
            </Card>
          </PaddedSC>
        )}
      </DetailSC>
      {updateTarget && (
        <WorkbenchMonitoringUpdatePanel
          open={updateOpen}
          onClose={() => setUpdateOpen(false)}
          kind={updateTarget.kind}
          id={updateTarget.id}
          name={updateTarget.name}
        />
      )}
    </WorkbenchPageLayout>
  )
}

const DetailSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  marginTop: -1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const PaddedSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))
