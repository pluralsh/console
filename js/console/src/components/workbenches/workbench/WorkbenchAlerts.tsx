import { Flex } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayFilterEmpty,
  DisplayPopover,
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
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  AlertSeverity,
  ObservabilityWebhookType,
  useWorkbenchAlertCountsQuery,
  useWorkbenchAlertsQuery,
} from 'generated/graphql'
import { compact, fromPairs, isEmpty, omit } from 'lodash'
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
  WORKBENCH_ALERTS_VIEWS,
  WorkbenchAlertsDisplayState,
} from './workbenchAlertsDisplay'

const WORKBENCH_ALERTS_VIEW_STORAGE_KEY = 'workbench-alerts-view'
const PAGE_SIZE = 50

const noop = () => {}

export function WorkbenchAlerts() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  // the view is remembered per user, filters and sort only for the visit
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_ALERTS_VIEW_STORAGE_KEY,
    WORKBENCH_ALERTS_VIEWS,
    DEFAULT_WORKBENCH_ALERTS_DISPLAY.view
  )
  const [filters, setFilters] = useState(() =>
    omit(DEFAULT_WORKBENCH_ALERTS_DISPLAY, 'view')
  )
  const display = useMemo(() => ({ ...filters, view }), [filters, view])
  const filterVars = useMemo(() => toAlertFilterVariables(display), [display])
  const updateDisplay = ({
    view: nextView,
    ...nextFilters
  }: WorkbenchAlertsDisplayState) => {
    setFilters(nextFilters)
    setView(nextView)
  }
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
      keyPath: ['workbench', 'alerts'],
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
    () =>
      fromPairs(
        compact(countsData?.workbench?.alertCounts?.types).map((entry) => [
          entry.type,
          entry.count,
        ])
      ) as Partial<Record<ObservabilityWebhookType, number>>,
    [countsData]
  )
  const severityCounts = useMemo(
    () =>
      fromPairs(
        compact(countsData?.workbench?.alertCounts?.severities).map((entry) => [
          entry.severity,
          entry.count,
        ])
      ) as Partial<Record<AlertSeverity, number>>,
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
  const tableSliceActive = view === 'list'
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
        <DisplayPopover showDot={hasUncheckedAlertFilters(display)}>
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
        <WrapperSC>
          <WorkbenchSearchInput
            value={searchString}
            onChange={setSearchString}
            placeholder="Search alerts"
          />
          {error ? (
            <GqlError error={error} />
          ) : filterEmptyKind ? (
            <DisplayFilterEmpty
              title={`No ${filterEmptyKind} selected`}
              description={`It looks like there are no ${filterEmptyKind} selected.`}
              onReset={() => updateDisplay(resetAlertFilters(display))}
            />
          ) : view === 'board' ? (
            <WorkbenchAlertsBoard
              totalCount={totalCount}
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
