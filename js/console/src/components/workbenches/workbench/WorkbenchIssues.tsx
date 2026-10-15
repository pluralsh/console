import { useDebounce } from '@react-hooks-library/core'
import { WorkbenchIssuesBoard } from 'components/workbenches/common/WorkbenchIssuesBoard'
import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchMonitoringContent } from 'components/workbenches/common/WorkbenchMonitoringContent'
import {
  DisplayPopover,
  toCounts,
  useDisplayState,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchIssuesQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { useWorkbenchIssuesDetails } from './WorkbenchIssuesDetails'
import { WorkbenchIssuesDisplayOptions } from './WorkbenchIssuesDisplayOptions'
import {
  DEFAULT_WORKBENCH_ISSUES_DISPLAY,
  getIssueFilterEmptyKind,
  hasUncheckedIssueFilters,
  resetIssueFilters,
  toIssueFilterVariables,
  visibleIssueProviders,
} from './workbenchIssuesDisplay'

const WORKBENCH_ISSUES_VIEW_STORAGE_KEY = 'workbench-issues-view'
const PAGE_SIZE = 50

// stable, so the paginated data callbacks don't change every render
const ISSUES_KEY_PATH = ['workbench', 'issues']

export function WorkbenchIssues() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { display, updateDisplay } = useDisplayState(
    WORKBENCH_ISSUES_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCH_ISSUES_DISPLAY
  )
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString.trim(), 200)
  const filterVars = useMemo(() => toIssueFilterVariables(display), [display])

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
      queryHook: useWorkbenchIssuesQuery,
      keyPath: ISSUES_KEY_PATH,
      pageSize: PAGE_SIZE,
      keepLoadedPages: true,
    },
    {
      id: workbenchId,
      q: isEmpty(debouncedSearchString) ? undefined : debouncedSearchString,
      ...filterVars,
    }
  )
  const issues = useMemo(
    () => mapExistingNodes(data?.workbench?.issues),
    [data]
  )
  const providerCounts = useMemo(
    () => toCounts(data?.workbench?.issueCounts?.providers, (e) => e.provider),
    [data]
  )
  const statusCounts = useMemo(
    () => toCounts(data?.workbench?.issueCounts?.statuses, (e) => e.status),
    [data]
  )
  const filterEmptyKind = useMemo(
    () =>
      getIssueFilterEmptyKind(display, visibleIssueProviders(providerCounts)),
    [display, providerCounts]
  )

  // only the table reports its visible slice; drop it in other views so
  // polling keeps every page loaded in Board/Details
  const tableSliceActive = display.view === 'list'
  useEffect(() => {
    if (!tableSliceActive) setVirtualSlice(undefined)
  }, [tableSliceActive, setVirtualSlice])

  const filtered = hasUncheckedIssueFilters(display)
  const onResetFilters = () => updateDisplay(resetIssueFilters(display))
  const listProps = {
    issues,
    loading: !data && loading,
    fetchingMore,
    hasNextPage: !!pageInfo?.hasNextPage,
    fetchNextPage,
    fallbackWorkbenchId: workbenchId,
  }
  const details = useWorkbenchIssuesDetails({
    ...listProps,
    active: display.view === 'details',
    emptyState: {
      searching: !!debouncedSearchString,
      filtered,
      onResetFilters,
    },
    searchString,
    onSearchChange: setSearchString,
  })
  const showDetails = display.view === 'details' && !error && !filterEmptyKind

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
        tabStripHeight: DETAILS_TAB_STRIP_HEIGHT,
      })}
      headerActions={
        <DisplayPopover showDot={filtered}>
          <WorkbenchIssuesDisplayOptions
            state={display}
            onChange={updateDisplay}
            providerCounts={providerCounts}
            statusCounts={statusCounts}
          />
        </DisplayPopover>
      }
    >
      {showDetails ? (
        details.content
      ) : (
        <WorkbenchMonitoringContent
          searchString={searchString}
          onSearchChange={setSearchString}
          searchPlaceholder="Search issues"
          error={error}
          filterEmptyKind={filterEmptyKind}
          onResetFilters={onResetFilters}
        >
          {display.view === 'board' ? (
            <WorkbenchIssuesBoard
              {...listProps}
              statuses={display.statuses}
            />
          ) : (
            <WorkbenchIssuesTable
              issues={issues}
              loading={listProps.loading}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              setVirtualSlice={setVirtualSlice}
              fallbackWorkbenchId={workbenchId}
            />
          )}
        </WorkbenchMonitoringContent>
      )}
    </WorkbenchPageLayout>
  )
}
