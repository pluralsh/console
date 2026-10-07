import { Flex } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayFilterEmpty,
  DisplayPopover,
  usePersistedDisplayView,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  SortDirection,
  useWorkbenchJobCountsQuery,
  useWorkbenchJobSearchQuery,
  useWorkbenchJobsQuery,
  WorkbenchJobPrState,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { compact, fromPairs, omit } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import { WorkbenchJobsBoard } from './WorkbenchJobsBoard'
import { useWorkbenchJobsDetails } from './WorkbenchJobsDetails'
import { WorkbenchJobsDisplayOptions } from './WorkbenchJobsDisplayOptions'
import { WorkbenchJobsTableContent } from './WorkbenchJobsTable'
import {
  DEFAULT_WORKBENCH_JOBS_DISPLAY,
  getJobFilterEmptyKind,
  hasUncheckedJobFilters,
  resetJobFilters,
  toJobFilterVariables,
  WORKBENCH_JOBS_VIEWS,
  WorkbenchJobsDisplayState,
} from './workbenchJobsDisplay'

const WORKBENCH_JOBS_VIEW_STORAGE_KEY = 'workbench-jobs-view'
const SEARCH_LIMIT = 50
const noop = () => {}

export function WorkbenchJobs() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  // the view is remembered per user, filters and sort only for the visit
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_JOBS_VIEW_STORAGE_KEY,
    WORKBENCH_JOBS_VIEWS,
    DEFAULT_WORKBENCH_JOBS_DISPLAY.view
  )
  const [filters, setFilters] = useState(() =>
    omit(DEFAULT_WORKBENCH_JOBS_DISPLAY, 'view')
  )
  const display = useMemo(() => ({ ...filters, view }), [filters, view])
  const updateDisplay = ({
    view: nextView,
    ...nextFilters
  }: WorkbenchJobsDisplayState) => {
    setFilters(nextFilters)
    setView(nextView)
  }
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
    { queryHook: useWorkbenchJobsQuery, keyPath: ['workbench', 'runs'] },
    {
      id: workbenchId,
      ...filterVars,
      direction:
        filters.direction === SortDirection.Desc
          ? undefined
          : filters.direction,
    }
  )
  const search = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: query, limit: SEARCH_LIMIT, ...filterVars },
    skip: !searching,
    fetchPolicy: 'network-only',
    pollInterval: POLL_INTERVAL,
  })
  const { data: countsData } = useWorkbenchJobCountsQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const statusCounts = useMemo(
    () =>
      fromPairs(
        compact(countsData?.workbench?.runCounts?.statuses).map((entry) => [
          entry.status,
          entry.count,
        ])
      ) as Partial<Record<WorkbenchJobStatus, number>>,
    [countsData]
  )
  const prStateCounts = useMemo(
    () =>
      fromPairs(
        compact(countsData?.workbench?.runCounts?.pullRequests).map((entry) => [
          entry.state,
          entry.count,
        ])
      ) as Partial<Record<WorkbenchJobPrState, number>>,
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
  const details = useWorkbenchJobsDetails({
    workbenchId,
    jobs,
    loading: !list.loaded && list.loading,
    fetchingMore: list.fetchingMore,
    hasNextPage: list.hasNextPage,
    fetchNextPage: list.fetchNextPage,
    searchString,
    onSearchChange: setSearchString,
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
        <DisplayPopover showDot={hasUncheckedJobFilters(filters)}>
          <WorkbenchJobsDisplayOptions
            state={display}
            onChange={updateDisplay}
            statusCounts={statusCounts}
            prStateCounts={prStateCounts}
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
            placeholder="Search jobs"
          />
          {listError ? (
            <GqlError error={listError} />
          ) : filterEmptyKind ? (
            <DisplayFilterEmpty
              title={`No ${filterEmptyKind} selected`}
              description={`It looks like there are no ${filterEmptyKind} selected.`}
              onReset={() => updateDisplay(resetJobFilters(display))}
            />
          ) : view === 'board' ? (
            <WorkbenchJobsBoard
              jobs={jobs}
              loading={!list.loaded && list.loading}
              fetchingMore={list.fetchingMore}
              hasNextPage={list.hasNextPage}
              fetchNextPage={list.fetchNextPage}
              showRecent={!searching}
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
        </WrapperSC>
      )}
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  minHeight: 400,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
