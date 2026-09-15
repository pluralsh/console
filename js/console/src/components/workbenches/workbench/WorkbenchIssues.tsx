import { Flex, SearchIcon } from '@pluralsh/design-system'
import { useDebounce, useKeyDown } from '@react-hooks-library/core'
import usePersistedState from 'components/hooks/usePersistedState'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'
import { WorkbenchIssuesBoard } from 'components/workbenches/common/WorkbenchIssuesBoard'
import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayButton,
  DisplayContentSC,
  DisplayFilterEmpty,
  DisplayMainSC,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  IssueStatus,
  IssueWebhookProvider,
  useWorkbenchIssuesQuery,
} from 'generated/graphql'
import { compact, fromPairs, isEmpty, isNil } from 'lodash'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { WorkbenchIssuesDisplayPanel } from './WorkbenchIssuesDisplayPanel'
import {
  DEFAULT_WORKBENCH_ISSUES_DISPLAY,
  getIssueFilterEmptyKind,
  hasUncheckedIssueFilters,
  resetIssueFilters,
  toIssueFilterVariables,
  visibleIssueProviders,
  WorkbenchIssuesDisplayState,
  WorkbenchIssuesView,
} from './workbenchIssuesDisplay'

const WORKBENCH_ISSUES_VIEW_STORAGE_KEY = 'workbench-issues-view'
const SEARCH_INPUT_WIDTH = 520

export function WorkbenchIssues() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [persistedView, setPersistedView] = usePersistedState(
    WORKBENCH_ISSUES_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCH_ISSUES_DISPLAY.view,
    0,
    (value: unknown): WorkbenchIssuesView =>
      value === 'board' ? 'board' : 'list'
  )
  const [searchString, setSearchString] = useState('')
  const [displayOpen, setDisplayOpen] = useState(false)
  const [display, setDisplay] = useState(() => ({
    ...DEFAULT_WORKBENCH_ISSUES_DISPLAY,
    view: persistedView,
  }))
  const debouncedSearchString = useDebounce(searchString.trim(), 200)
  const filterVars = useMemo(() => toIssueFilterVariables(display), [display])
  const updateDisplay = (next: WorkbenchIssuesDisplayState) => {
    setDisplay(next)
    setPersistedView(next.view)
  }
  const clearSearch = () => setSearchString('')

  useKeyDown(['Escape'], clearSearch)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
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

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      headerActions={
        <>
          <IconExpander
            tooltip="Search issues"
            icon={<SearchIcon />}
            active={!!searchString}
            onClear={clearSearch}
          >
            <ExpandedInput
              width={SEARCH_INPUT_WIDTH}
              inputValue={searchString}
              onChange={setSearchString}
              placeholder="Search issues"
            />
          </IconExpander>
          <DisplayButton
            showDot={hasUncheckedIssueFilters(display)}
            onClick={() => setDisplayOpen(!displayOpen)}
          />
        </>
      }
    >
      {error ? (
        <GqlError error={error} />
      ) : (
        <WrapperSC>
          <DisplayContentSC>
            <DisplayMainSC>
              {filterEmptyKind ? (
                <DisplayFilterEmpty
                  title={`No ${filterEmptyKind} selected`}
                  description={`It looks like there are no ${filterEmptyKind} selected.`}
                  onReset={() => updateDisplay(resetIssueFilters(display))}
                />
              ) : display.view === 'board' ? (
                <WorkbenchIssuesBoard
                  issues={issues}
                  statuses={display.statuses}
                  loading={loading}
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
                  setVirtualSlice={setVirtualSlice}
                  fallbackWorkbenchId={workbenchId}
                />
              )}
            </DisplayMainSC>
            {displayOpen && (
              <WorkbenchIssuesDisplayPanel
                state={display}
                onChange={updateDisplay}
                providerCounts={providerCounts}
                statusCounts={statusCounts}
              />
            )}
          </DisplayContentSC>
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
