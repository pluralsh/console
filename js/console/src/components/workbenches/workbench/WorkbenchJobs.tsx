import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DisplayPopover,
  toCounts,
  useDisplayState,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchMonitoringContent } from 'components/workbenches/common/WorkbenchMonitoringContent'
import {
  SortDirection,
  useWorkbenchJobCountsQuery,
  useWorkbenchJobSearchQuery,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import {
  BOARD_RECENT_JOBS_COUNT,
  WorkbenchJobsBoard,
} from './WorkbenchJobsBoard'
import { useWorkbenchJobsDetails } from './WorkbenchJobsDetails'
import { WorkbenchJobsDisplayOptions } from './WorkbenchJobsDisplayOptions'
import { WorkbenchJobsTableContent } from './WorkbenchJobsTable'
import {
  DEFAULT_WORKBENCH_JOBS_DISPLAY,
  getJobFilterEmptyKind,
  hasUncheckedJobFilters,
  resetJobFilters,
  toJobFilterVariables,
  WORKBENCH_JOBS_PAGE_SIZE,
} from './workbenchJobsDisplay'

const WORKBENCH_JOBS_VIEW_STORAGE_KEY = 'workbench-jobs-view'
const SEARCH_LIMIT = 50
const noop = () => {}
// stable, so the paginated data callbacks don't change every render
const RUNS_KEY_PATH = ['workbench', 'runs']

export function WorkbenchJobs() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const { display, filters, updateDisplay } = useDisplayState(
    WORKBENCH_JOBS_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCH_JOBS_DISPLAY
  )
  const { view } = display
  const filterVars = useMemo(() => toJobFilterVariables(filters), [filters])
  const filterEmptyKind = getJobFilterEmptyKind(filters)
  const [searchString, setSearchString] = useState('')
  const query = useDebounce(searchString, 200).trim()
  const searching = !!query

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
      queryHook: useWorkbenchJobsQuery,
      keyPath: RUNS_KEY_PATH,
      pageSize: WORKBENCH_JOBS_PAGE_SIZE,
      keepLoadedPages: true,
      // a filter with nothing selected matches nothing, so there's no query;
      // while searching the list is hidden, so it isn't polled
      skip: !!filterEmptyKind,
      pollInterval: searching ? 0 : undefined,
    },
    {
      id: workbenchId,
      withTotal: true,
      ...filterVars,
      direction:
        filters.direction === SortDirection.Desc
          ? undefined
          : filters.direction,
    }
  )
  const search = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: query, limit: SEARCH_LIMIT, ...filterVars },
    skip: !searching || !!filterEmptyKind,
    // not polled: every search runs a vector store (embedding) lookup
    fetchPolicy: 'network-only',
  })
  const { data: countsData } = useWorkbenchJobCountsQuery({
    variables: { id: workbenchId },
    // not polled here: the workbench layout already polls these counts for
    // its in-progress dot, keeping this cached result current
    fetchPolicy: 'cache-and-network',
  })
  const statusCounts = useMemo(
    () => toCounts(countsData?.workbench?.runCounts?.statuses, (e) => e.status),
    [countsData]
  )
  const prStateCounts = useMemo(
    () =>
      toCounts(countsData?.workbench?.runCounts?.pullRequests, (e) => e.state),
    [countsData]
  )

  // only the table reports its visible slice (and only for the runs list);
  // drop it otherwise so polling keeps every page loaded in Board/Details
  const tableSliceActive = view === 'list' && !searching
  useEffect(() => {
    if (!tableSliceActive) setVirtualSlice(undefined)
  }, [tableSliceActive, setVirtualSlice])

  // searching shows the (unpaginated) search results in every view
  const jobs = useMemo(
    () =>
      searching
        ? (search.data?.workbenchJobSearch ?? []).filter(isNonNullable)
        : mapExistingNodes(data?.workbench?.runs),
    [data, search.data, searching]
  )
  // newest first, the list already starts with the recent jobs; otherwise
  // they're fetched on their own for the board
  const fetchRecent =
    view === 'board' &&
    !searching &&
    !filterEmptyKind &&
    filters.direction !== SortDirection.Desc
  const { data: recentData } = useWorkbenchJobsQuery({
    variables: {
      id: workbenchId,
      first: BOARD_RECENT_JOBS_COUNT,
      ...filterVars,
    },
    skip: !fetchRecent,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const recentJobs = useMemo(
    () =>
      searching
        ? undefined
        : fetchRecent
          ? mapExistingNodes(recentData?.workbench?.runs)
          : jobs.slice(0, BOARD_RECENT_JOBS_COUNT),
    [fetchRecent, jobs, recentData, searching]
  )
  const list = searching
    ? {
        loading: search.loading,
        loaded: !!search.data,
        fetchingMore: false,
        hasNextPage: false,
        fetchNextPage: noop,
      }
    : {
        loading,
        loaded: !!data,
        fetchingMore,
        hasNextPage: !!pageInfo?.hasNextPage,
        fetchNextPage,
      }
  const listError = searching ? search.error : error
  const filtered = hasUncheckedJobFilters(filters)
  const emptyState = {
    searching,
    filtered,
    onResetFilters: () => updateDisplay(resetJobFilters(display)),
  }
  const listProps = {
    ...list,
    jobs,
    loading: !list.loaded && list.loading,
    emptyState,
  }
  const details = useWorkbenchJobsDetails({
    ...listProps,
    workbenchId,
    searchString,
    onSearchChange: setSearchString,
    active: view === 'details',
  })
  const showDetails = view === 'details' && !listError && !filterEmptyKind

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
        tabStripHeight: DETAILS_TAB_STRIP_HEIGHT,
      })}
      headerActions={
        <DisplayPopover showDot={filtered}>
          <WorkbenchJobsDisplayOptions
            state={display}
            onChange={updateDisplay}
            statusCounts={statusCounts}
            prStateCounts={prStateCounts}
            searching={searching}
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
          searchPlaceholder="Search jobs"
          error={listError}
          filterEmptyKind={filterEmptyKind}
          onResetFilters={emptyState.onResetFilters}
          minHeight={400}
        >
          {view === 'board' ? (
            <WorkbenchJobsBoard
              {...listProps}
              recentJobs={recentJobs}
              totalCount={
                searching ? jobs.length : data?.workbench?.runs?.totalCount
              }
            />
          ) : (
            <TableContainerSC>
              <WorkbenchJobsTableContent
                jobs={jobs}
                loading={list.loading}
                loaded={list.loaded}
                pageInfo={searching ? undefined : pageInfo}
                fetchNextPage={list.fetchNextPage}
                setVirtualSlice={tableSliceActive ? setVirtualSlice : noop}
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
