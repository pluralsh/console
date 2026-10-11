import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DisplayPopover,
  toCounts,
  useDisplayState,
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
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchMonitoringContent } from 'components/workbenches/common/WorkbenchMonitoringContent'
import {
  useWorkbenchAlertCountsQuery,
  useWorkbenchAlertsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { WorkbenchAlertsBoard } from './WorkbenchAlertsBoard'
import { useWorkbenchAlertsDetails } from './WorkbenchAlertsDetails'
import { WorkbenchAlertsDisplayOptions } from './WorkbenchAlertsDisplayOptions'
import {
  DEFAULT_WORKBENCH_ALERTS_DISPLAY,
  getAlertFilterEmptyKind,
  hasUncheckedAlertFilters,
  resetAlertFilters,
  toAlertFilterVariables,
  visibleAlertTypes,
} from './workbenchAlertsDisplay'

const WORKBENCH_ALERTS_VIEW_STORAGE_KEY = 'workbench-alerts-view'
const PAGE_SIZE = 50

// stable, so the paginated data callbacks don't change every render
const ALERTS_KEY_PATH = ['workbench', 'alerts']

export function WorkbenchAlerts() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { display, updateDisplay } = useDisplayState(
    WORKBENCH_ALERTS_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCH_ALERTS_DISPLAY
  )
  const { view } = display
  const filterVars = useMemo(() => toAlertFilterVariables(display), [display])
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString.trim(), 200)
  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    fetchingMore,
  } = useFetchPaginatedData(
    {
      queryHook: useWorkbenchAlertsQuery,
      keyPath: ALERTS_KEY_PATH,
      pageSize: PAGE_SIZE,
      keepLoadedPages: true,
    },
    {
      id: workbenchId,
      q: isEmpty(debouncedSearchString) ? undefined : debouncedSearchString,
      ...filterVars,
    }
  )
  // polled on their own, so they stay current however many pages are loaded
  const { data: countsData } = useWorkbenchAlertCountsQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const typeCounts = useMemo(
    () => toCounts(countsData?.workbench?.alertCounts?.types, (e) => e.type),
    [countsData]
  )
  const severityCounts = useMemo(
    () =>
      toCounts(
        countsData?.workbench?.alertCounts?.severities,
        (e) => e.severity
      ),
    [countsData]
  )
  const filterEmptyKind = useMemo(
    () => getAlertFilterEmptyKind(display, visibleAlertTypes(typeCounts)),
    [display, typeCounts]
  )
  const totalCount = data?.workbench?.alerts?.totalCount
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
          workbenchId,
          jobId: alert.workbenchJob.id,
          status: alert.workbenchJob.status,
        }
      }),
    ],
    [workbenchId]
  )

  // only the table reports its visible slice; drop it in other views so
  // polling keeps every page loaded in Board/Details
  const tableSliceActive = view === 'list'
  useEffect(() => {
    if (!tableSliceActive) setVirtualSlice(undefined)
  }, [tableSliceActive, setVirtualSlice])

  const filtered = hasUncheckedAlertFilters(display)
  const emptyState = {
    searching: !!debouncedSearchString,
    filtered,
    onResetFilters: () => updateDisplay(resetAlertFilters(display)),
  }
  const listProps = {
    alerts,
    loading: !data && loading,
    fetchingMore,
    hasNextPage: !!pageInfo?.hasNextPage,
    fetchNextPage,
    workbenchId,
    emptyState,
  }
  const details = useWorkbenchAlertsDetails({
    ...listProps,
    active: view === 'details',
    searchString,
    onSearchChange: setSearchString,
    severities: display.severities,
    severityCounts,
    onSeveritiesChange: (severities) =>
      updateDisplay({ ...display, severities }),
  })
  const showDetails = view === 'details' && !error && !filterEmptyKind

  return (
    <WorkbenchPageLayout
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
        tabStripHeight: DETAILS_TAB_STRIP_HEIGHT,
      })}
      headerActions={
        <DisplayPopover showDot={filtered}>
          <WorkbenchAlertsDisplayOptions
            state={display}
            onChange={updateDisplay}
            typeCounts={typeCounts}
            severityCounts={severityCounts}
          />
        </DisplayPopover>
      }
    >
      {showDetails ? (
        details.content
      ) : (
        <WorkbenchMonitoringContent
          search={{
            searchString,
            onSearchChange: setSearchString,
            searchPlaceholder: 'Search alerts',
          }}
          error={error}
          filterEmptyKind={filterEmptyKind}
          onResetFilters={emptyState.onResetFilters}
        >
          {view === 'board' ? (
            <WorkbenchAlertsBoard
              {...listProps}
              totalCount={totalCount}
            />
          ) : (
            <TableContainerSC>
              <AlertsTable
                alerts={alerts}
                loading={listProps.loading}
                error={null}
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
        </WorkbenchMonitoringContent>
      )}
    </WorkbenchPageLayout>
  )
}

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
