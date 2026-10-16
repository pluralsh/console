import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DisplayButton,
  DisplayPanel,
  toCounts,
  useDisplaySidecar,
  useDisplayState,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { WorkbenchMonitoringContent } from 'components/workbenches/common/WorkbenchMonitoringContent'
import { WorkbenchHeaderSearch } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  SortDirection,
  useWorkbenchJobCountsQuery,
  useWorkbenchJobSearchQuery,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { WorkbenchJobsDocument } from 'generated/graphql-documents'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import {
  BOARD_RECENT_JOBS_COUNT,
  WorkbenchJobsBoard,
} from './WorkbenchJobsBoard'
import { useWorkbenchJobsDetails } from './WorkbenchJobsDetails'
import { WorkbenchJobsDisplayOptions } from './WorkbenchJobsDisplayOptions'
import { WorkbenchJobsGroupedList } from './WorkbenchJobsGroupedList'
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

  const direction =
    filters.direction === SortDirection.Desc ? undefined : filters.direction
  // the List view groups by status itself, one query per group
  const grouped = view === 'list'
  const groupFilters = useMemo(
    () => ({
      q: query || undefined,
      prStates: filterVars.prStates,
      direction,
    }),
    [query, filterVars, direction]
  )

  const { data, loading, error, pageInfo, fetchNextPage, fetchingMore } =
    useFetchPaginatedData(
      {
        query: WorkbenchJobsDocument,
        keyPath: RUNS_KEY_PATH,
        pageSize: WORKBENCH_JOBS_PAGE_SIZE,
        keepLoadedPages: true,
        // a filter with nothing selected matches nothing, so there's no query;
        // while searching the list is hidden, so it isn't polled
        skip: !!filterEmptyKind || grouped,
        pollInterval: searching ? 0 : undefined,
      },
      { id: workbenchId, withTotal: true, ...filterVars, direction }
    )
  const search = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: query, limit: SEARCH_LIMIT, ...filterVars },
    skip: !searching || !!filterEmptyKind || grouped,
    // not polled: results only change as the (debounced) search does
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
  const displaySidecar = useDisplaySidecar(grouped)
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
      sidecar={
        displaySidecar.isOpen && (
          <DisplayPanel>
            <WorkbenchJobsDisplayOptions
              state={display}
              onChange={updateDisplay}
              statusCounts={statusCounts}
              prStateCounts={prStateCounts}
              searching={searching}
            />
          </DisplayPanel>
        )
      }
      showEditWorkbenchButton={false}
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
      })}
      headerActions={
        <>
          {!showDetails && (
            <WorkbenchHeaderSearch
              value={searchString}
              onChange={setSearchString}
              placeholder="Search jobs"
            />
          )}
          <DisplayButton
            showDot={filtered}
            expanded={displaySidecar.isOpen}
            onClick={displaySidecar.toggle}
          />
        </>
      }
    >
      {showDetails ? (
        details.content
      ) : (
        <WorkbenchMonitoringContent
          error={listError}
          filterEmptyKind={filterEmptyKind}
          onResetFilters={emptyState.onResetFilters}
          minHeight={400}
        >
          {grouped ? (
            <WorkbenchJobsGroupedList
              workbenchId={workbenchId}
              statuses={display.statuses}
              filters={groupFilters}
              emptyState={emptyState}
            />
          ) : (
            <WorkbenchJobsBoard
              {...listProps}
              recentJobs={recentJobs}
              totalCount={
                searching ? jobs.length : data?.workbench?.runs?.totalCount
              }
            />
          )}
        </WorkbenchMonitoringContent>
      )}
    </WorkbenchPageLayout>
  )
}
