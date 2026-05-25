import {
  useClickOutside,
  useDebounce,
  useKeyDown,
} from '@react-hooks-library/core'
import {
  Card,
  CaretRightIcon,
  EmptyState,
  Flex,
  SearchIcon,
  Spinner,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { GqlError } from 'components/utils/Alert'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import {
  useWorkbenchJobSearchQuery,
  WorkbenchJobSearchRowFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { JobConclusionIcon } from './WorkbenchJobsTable'

const SEARCH_LIMIT = 20
const INPUT_WIDTH = 520

export function WorkbenchJobsSearch({ workbenchId }: { workbenchId: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 200)
  const trimmedQuery = debouncedQuery.trim()
  const showDropdown = dropdownOpen && trimmedQuery.length > 0

  const { data, loading, error } = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: trimmedQuery, limit: SEARCH_LIMIT },
    skip: !showDropdown,
    fetchPolicy: 'network-only',
  })

  const results = useMemo(
    () => (data?.workbenchJobSearch ?? []).filter(isNonNullable),
    [data?.workbenchJobSearch]
  )

  const clearSearch = () => {
    setQuery('')
    setDropdownOpen(false)
  }

  const closeDropdown = () => setDropdownOpen(false)

  useClickOutside(ref, closeDropdown)

  useKeyDown(['Escape'], clearSearch)

  return (
    <SearchWrapperSC ref={ref}>
      <IconExpander
        tooltip="Search jobs"
        icon={<SearchIcon />}
        active={!!query}
        onClear={clearSearch}
      >
        <ExpandedInput
          width={INPUT_WIDTH}
          inputValue={query}
          onChange={(value) => {
            setQuery(value)
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Search jobs"
        />
      </IconExpander>
      {showDropdown && (
        <DropdownSC
          fillLevel={1}
          css={{ overflow: 'hidden' }}
        >
          {error ? (
            <DropdownBodySC>
              <GqlError error={error} />
            </DropdownBodySC>
          ) : loading && !data ? (
            <DropdownBodySC>
              <Flex
                align="center"
                justify="center"
                padding="large"
              >
                <Spinner />
              </Flex>
            </DropdownBodySC>
          ) : isEmpty(results) ? (
            <DropdownBodySC>
              <EmptyState message="No matching jobs found." />
            </DropdownBodySC>
          ) : (
            <ResultsListSC>
              {results.map((job) => (
                <WorkbenchJobSearchResultRow
                  key={job.id}
                  job={job}
                  workbenchId={workbenchId}
                  onNavigate={closeDropdown}
                />
              ))}
            </ResultsListSC>
          )}
        </DropdownSC>
      )}
    </SearchWrapperSC>
  )
}

function WorkbenchJobSearchResultRow({
  job,
  workbenchId,
  onNavigate,
}: {
  job: WorkbenchJobSearchRowFragment
  workbenchId: string
  onNavigate: () => void
}) {
  const theme = useTheme()
  const prs = useMemo(
    () => job.pullRequests?.filter(isNonNullable) ?? [],
    [job.pullRequests]
  )

  return (
    <ResultRowSC
      to={getWorkbenchJobAbsPath({ workbenchId, jobId: job.id })}
      onClick={onNavigate}
    >
      <WorkbenchStoredPromptMarkdown
        text={job.prompt ?? ''}
        density="tableCell"
        clampLines={1}
      />
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
          alignItems: 'center',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PRsModalIcon prs={prs} />
        <JobConclusionIcon result={job.result} />
        <RunStatusIcon
          fullColor
          status={job.status}
        />
        <CaretRightIcon color="icon-xlight" />
      </div>
    </ResultRowSC>
  )
}

const SearchWrapperSC = styled.div({
  position: 'relative',
  display: 'inline-block',
})

const DropdownSC = styled(Card)(({ theme }) => ({
  position: 'absolute',
  top: `calc(100% + ${theme.spacing.xsmall}px)`,
  left: 0,
  width: '100%',
  zIndex: theme.zIndexes.modal,
  maxHeight: 360,
  overflow: 'hidden',
}))

const DropdownBodySC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
}))

const ResultsListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  maxHeight: 360,
  borderTop: theme.borders.default,
}))

const ResultRowSC = styled(Link)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) min-content',
  gap: theme.spacing.medium,
  alignItems: 'center',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  textDecoration: 'none',
  color: 'inherit',
  borderBottom: theme.borders.default,
  '&:last-child': {
    borderBottom: 'none',
  },
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))
