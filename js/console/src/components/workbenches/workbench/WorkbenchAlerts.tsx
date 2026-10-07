import { Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayPopover,
  DisplayView,
  DisplayViewToggle,
  usePersistedDisplayView,
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
import { getAlertName } from 'components/utils/alerts/AlertSourceLink'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import { useWorkbenchAlertsQuery } from 'generated/graphql'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { WorkbenchAlertsBoard } from './WorkbenchAlertsBoard'
import { useWorkbenchAlertsDetails } from './WorkbenchAlertsDetails'

const WORKBENCH_ALERTS_VIEW_STORAGE_KEY = 'workbench-alerts-view'
const WORKBENCH_ALERTS_VIEWS: DisplayView[] = ['list', 'board', 'details']
const DEFAULT_WORKBENCH_ALERTS_VIEW: DisplayView = 'list'

const noop = () => {}

export function WorkbenchAlerts() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_ALERTS_VIEW_STORAGE_KEY,
    WORKBENCH_ALERTS_VIEWS,
    DEFAULT_WORKBENCH_ALERTS_VIEW
  )
  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    fetchingMore,
  } = useFetchPaginatedData(
    { queryHook: useWorkbenchAlertsQuery, keyPath: ['workbench', 'alerts'] },
    { id: workbenchId }
  )
  const [searchString, setSearchString] = useState('')
  const query = useDeferredValue(searchString.trim().toLowerCase())
  // the workbench alerts query can't search, so this filters loaded alerts
  const alerts = useMemo(
    () =>
      mapExistingNodes(data?.workbench?.alerts).filter(
        (alert) =>
          !query ||
          [alert.title, getAlertName(alert)].some((text) =>
            text?.toLowerCase().includes(query)
          )
      ),
    [data, query]
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

  // only the table reports its visible slice; drop it in other views so
  // polling keeps every page loaded in Board/Details
  const tableSliceActive = view === 'list' && !query
  useEffect(() => {
    if (!tableSliceActive) setVirtualSlice(undefined)
  }, [tableSliceActive, setVirtualSlice])

  const details = useWorkbenchAlertsDetails({
    alerts,
    loading: !data && loading,
    fetchingMore,
    hasNextPage: !!pageInfo?.hasNextPage,
    fetchNextPage,
    fallbackWorkbenchId: workbenchId,
    searchString,
    onSearchChange: setSearchString,
  })
  const showDetails = view === 'details' && !error

  return (
    <WorkbenchPageLayout
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
        tabStripHeight: DETAILS_TAB_STRIP_HEIGHT,
      })}
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
      {error ? (
        <GqlError error={error} />
      ) : showDetails ? (
        details.content
      ) : (
        <WrapperSC>
          <WorkbenchSearchInput
            value={searchString}
            onChange={setSearchString}
            placeholder="Search alerts"
          />
          {view === 'board' ? (
            <WorkbenchAlertsBoard
              alerts={alerts}
              loading={!data && loading}
              fetchingMore={fetchingMore}
              hasNextPage={!!pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              fallbackWorkbenchId={workbenchId}
            />
          ) : (
            <TableContainerSC>
              <AlertsTable
                alerts={alerts}
                loading={!data && loading}
                error={null}
                hasNextPage={pageInfo?.hasNextPage}
                fetchNextPage={fetchNextPage}
                setVirtualSlice={tableSliceActive ? setVirtualSlice : noop}
                hideHeader
                columns={columns}
                fillLevel={0}
                rowBg="stripes"
              />
            </TableContainerSC>
          )}
        </WrapperSC>
      )}
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 160,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
