import { Flex } from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayPopover,
  DisplayView,
  DisplayViewToggle,
  parseDisplayView,
} from 'components/utils/display/DisplayPanel'
import {
  AlertsTable,
  ColAlertExpander,
  ColAlertSeverity,
  ColAlertSourceLink,
  ColAlertState,
  ColAlertTitle,
  getColAlertViewJob,
} from '../../utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchAlertsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { WorkbenchAlertsBoard } from './WorkbenchAlertsBoard'

const WORKBENCH_ALERTS_VIEW_STORAGE_KEY = 'workbench-alerts-view'
const WORKBENCH_ALERTS_VIEWS: DisplayView[] = ['list', 'board']
const DEFAULT_WORKBENCH_ALERTS_VIEW: DisplayView = 'list'

export function WorkbenchAlerts() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [view, setView] = usePersistedState(
    WORKBENCH_ALERTS_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCH_ALERTS_VIEW,
    0,
    (value: unknown): DisplayView =>
      parseDisplayView(
        value,
        WORKBENCH_ALERTS_VIEWS,
        DEFAULT_WORKBENCH_ALERTS_VIEW
      )
  )
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchAlertsQuery, keyPath: ['workbench', 'alerts'] },
      { id: workbenchId }
    )
  const alerts = useMemo(
    () => mapExistingNodes(data?.workbench?.alerts),
    [data]
  )

  const columns = useMemo(
    () => [
      ColAlertExpander,
      ColAlertTitle,
      ColAlertSourceLink,
      ColAlertState,
      ColAlertSeverity,
      getColAlertViewJob((alert) => {
        if (!alert.workbenchJob?.id) return null

        return {
          workbenchId: alert.workbench?.id ?? workbenchId,
          jobId: alert.workbenchJob.id,
          status: alert.workbenchJob.status,
        }
      }),
    ],
    [workbenchId]
  )

  return (
    <WorkbenchPageLayout
      headerActions={
        <DisplayPopover showDot={false}>
          <DisplayViewToggle
            view={view}
            views={WORKBENCH_ALERTS_VIEWS}
            onChange={setView}
          />
        </DisplayPopover>
      }
    >
      <WrapperSC>
        {view === 'board' ? (
          error ? (
            <GqlError error={error} />
          ) : (
            <WorkbenchAlertsBoard
              alerts={alerts}
              loading={loading}
              hasNextPage={!!pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
            />
          )
        ) : (
          <TableContainerSC>
            <AlertsTable
              alerts={alerts}
              loading={!data && loading}
              error={error}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              setVirtualSlice={setVirtualSlice}
              hideHeader
              columns={columns}
              fillLevel={0}
              rowBg="stripes"
            />
          </TableContainerSC>
        )}
      </WrapperSC>
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  flex: 1,
  minHeight: 160,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
