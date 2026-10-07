import { Flex } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { WorkbenchIssuesBoard } from 'components/workbenches/common/WorkbenchIssuesBoard'
import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { DETAILS_TAB_STRIP_HEIGHT } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayFilterEmpty,
  DisplayPopover,
  usePersistedDisplayView,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  IssueStatus,
  IssueWebhookProvider,
  useWorkbenchIssuesQuery,
} from 'generated/graphql'
import { compact, fromPairs, isEmpty, isNil, omit } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { useWorkbenchIssuesDetails } from './WorkbenchIssuesDetails'
import { WorkbenchIssuesDisplayOptions } from './WorkbenchIssuesDisplayOptions'
import {
  DEFAULT_WORKBENCH_ISSUES_DISPLAY,
  getIssueFilterEmptyKind,
  WORKBENCH_ISSUES_VIEWS,
  hasUncheckedIssueFilters,
  resetIssueFilters,
  toIssueFilterVariables,
  visibleIssueProviders,
  WorkbenchIssuesDisplayState,
} from './workbenchIssuesDisplay'

const WORKBENCH_ISSUES_VIEW_STORAGE_KEY = 'workbench-issues-view'

const noop = () => {}

export function WorkbenchIssues() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  // the view is remembered per user, filters and sort only for the visit
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_ISSUES_VIEW_STORAGE_KEY,
    WORKBENCH_ISSUES_VIEWS,
    DEFAULT_WORKBENCH_ISSUES_DISPLAY.view
  )
  const [filters, setFilters] = useState(() =>
    omit(DEFAULT_WORKBENCH_ISSUES_DISPLAY, 'view')
  )
  const display = useMemo(() => ({ ...filters, view }), [filters, view])
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString.trim(), 200)
  const filterVars = useMemo(() => toIssueFilterVariables(display), [display])
  const updateDisplay = ({
    view: nextView,
    ...nextFilters
  }: WorkbenchIssuesDisplayState) => {
    setFilters(nextFilters)
    setView(nextView)
  }

  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    fetchingMore,
  } = useFetchPaginatedData(
    { queryHook: useWorkbenchIssuesQuery, keyPath: ['workbench', 'issues'] },
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
    () =>
      fromPairs(
        compact(data?.workbench?.issueCounts?.providers).map((entry) => [
          entry.provider,
          entry.count,
        ])
      ) as Partial<Record<IssueWebhookProvider, number>>,
    [data]
  )
  const statusCounts = useMemo(
    () =>
      fromPairs(
        compact(data?.workbench?.issueCounts?.statuses).map((entry) => [
          entry.status,
          entry.count,
        ])
      ) as Partial<Record<IssueStatus, number>>,
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

  const details = useWorkbenchIssuesDetails({
    issues,
    loading: !data && loading,
    fetchingMore,
    hasNextPage: !!pageInfo?.hasNextPage,
    fetchNextPage,
    searchString,
    onSearchChange: setSearchString,
    fallbackWorkbenchId: workbenchId,
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
        <>
          <DisplayPopover showDot={hasUncheckedIssueFilters(display)}>
            <WorkbenchIssuesDisplayOptions
              state={display}
              onChange={updateDisplay}
              providerCounts={providerCounts}
              statusCounts={statusCounts}
            />
          </DisplayPopover>
        </>
      }
    >
      {showDetails ? (
        details.content
      ) : (
        <WrapperSC>
          <WorkbenchSearchInput
            value={searchString}
            onChange={setSearchString}
            placeholder="Search issues"
          />
          {error ? (
            <GqlError error={error} />
          ) : filterEmptyKind ? (
            <DisplayFilterEmpty
              title={`No ${filterEmptyKind} selected`}
              description={`It looks like there are no ${filterEmptyKind} selected.`}
              onReset={() => updateDisplay(resetIssueFilters(display))}
            />
          ) : display.view === 'board' ? (
            <WorkbenchIssuesBoard
              issues={issues}
              statuses={display.statuses}
              loading={!data && loading}
              fetchingMore={fetchingMore}
              hasNextPage={!!pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              fallbackWorkbenchId={workbenchId}
            />
          ) : (
            <WorkbenchIssuesTable
              issues={issues}
              loading={isNil(data) && loading}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              setVirtualSlice={tableSliceActive ? setVirtualSlice : noop}
              fallbackWorkbenchId={workbenchId}
            />
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
