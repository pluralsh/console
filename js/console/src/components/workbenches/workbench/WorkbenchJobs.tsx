import { Flex } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayPopover,
  DisplayView,
  DisplayViewToggle,
  usePersistedDisplayView,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  useWorkbenchJobSearchQuery,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import { WorkbenchJobsBoard } from './WorkbenchJobsBoard'
import { useWorkbenchJobsDetails } from './WorkbenchJobsDetails'
import { WorkbenchJobsTableContent } from './WorkbenchJobsTable'

const WORKBENCH_JOBS_VIEW_STORAGE_KEY = 'workbench-jobs-view'
const WORKBENCH_JOBS_VIEWS: DisplayView[] = ['list', 'board', 'details']
const DEFAULT_WORKBENCH_JOBS_VIEW: DisplayView = 'list'
const SEARCH_LIMIT = 50
const noop = () => {}

export function WorkbenchJobs() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_JOBS_VIEW_STORAGE_KEY,
    WORKBENCH_JOBS_VIEWS,
    DEFAULT_WORKBENCH_JOBS_VIEW
  )
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
    { id: workbenchId }
  )
  const search = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: query, limit: SEARCH_LIMIT },
    skip: !searching,
    fetchPolicy: 'network-only',
    pollInterval: POLL_INTERVAL,
  })

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
  const showDetails = view === 'details' && !listError

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      {...(showDetails && {
        sidebar: { kind: 'custom', content: details.sidebar },
        tabStripHeight: DETAILS_TAB_STRIP_HEIGHT,
      })}
      headerActions={
        <DisplayPopover showDot={false}>
          <DisplayViewToggle
            view={view}
            views={WORKBENCH_JOBS_VIEWS}
            onChange={setView}
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
