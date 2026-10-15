import { AddIcon, Button } from '@pluralsh/design-system'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
import {
  useWorkbenchDashboardsQuery,
  useWorkbenchMonitoringDashboardQuery,
  useWorkbenchMonitorQuery,
  useWorkbenchMonitorsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  getWorkbenchMonitoringDashboardCreateAbsPath,
  getWorkbenchMonitoringMonitorCreateAbsPath,
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

  const dashboardQuery = useWorkbenchMonitoringDashboardQuery({
    variables: { id: dashboardId ?? '' },
    skip: !dashboardId || isDashboardCreate,
    fetchPolicy: 'cache-and-network',
  })
  const { data: dashboardData } = dashboardQuery
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

  return (
    <WorkbenchPageLayout
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
              query={dashboardQuery}
              onUpdate={() => setUpdateOpen(true)}
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
              onUpdate={() => setUpdateOpen(true)}
            />
          )
        ) : (
          <MonitoringEmptyState workbenchId={workbenchId} />
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

function MonitoringEmptyState({ workbenchId }: { workbenchId: string }) {
  const navigate = useNavigate()
  const variables = { id: workbenchId, first: 1 }
  const { data: dashboardsData } = useWorkbenchDashboardsQuery({
    variables,
    fetchPolicy: 'cache-and-network',
  })
  const { data: monitorsData } = useWorkbenchMonitorsQuery({
    variables,
    fetchPolicy: 'cache-and-network',
  })

  if (!dashboardsData || !monitorsData) return null

  const hasAny =
    !isEmpty(dashboardsData.workbench?.workbenchDashboards?.edges) ||
    !isEmpty(monitorsData.workbench?.monitors?.edges)

  return hasAny ? (
    <WorkbenchEmptyState
      message="Nothing selected"
      description="Select a dashboard or monitor from the list to view it."
    />
  ) : (
    <WorkbenchEmptyState
      message="No dashboards or monitors yet"
      description="Dashboards chart this workbench's metrics, logs, and traces. Monitors watch a query and alert when it crosses a threshold."
    >
      <Button
        small
        startIcon={<AddIcon />}
        onClick={() =>
          navigate(getWorkbenchMonitoringDashboardCreateAbsPath(workbenchId))
        }
      >
        Add dashboard
      </Button>
      <Button
        small
        secondary
        startIcon={<AddIcon />}
        onClick={() =>
          navigate(getWorkbenchMonitoringMonitorCreateAbsPath(workbenchId))
        }
      >
        Add monitor
      </Button>
    </WorkbenchEmptyState>
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
  padding: theme.spacing.large,
}))
