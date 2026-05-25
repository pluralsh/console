import { useClickOutside, useDebounce } from '@react-hooks-library/core'
import {
  Card,
  CaretRightIcon,
  EmptyState,
  Flex,
  Input,
  MagnifyingGlassIcon,
  Spinner,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { GqlError } from 'components/utils/Alert'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import {
  PullRequestBasicFragment,
  useWorkbenchJobSearchQuery,
  WorkbenchJobSearchResultFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { JobConclusionIcon } from './WorkbenchJobsTable'

const SEARCH_LIMIT = 20

export function WorkbenchJobsSearch({ workbenchId }: { workbenchId: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 200)
  const trimmedQuery = debouncedQuery.trim()
  const showDropdown = open && trimmedQuery.length > 0

  const { data, loading, error } = useWorkbenchJobSearchQuery({
    variables: { workbenchId, q: trimmedQuery, limit: SEARCH_LIMIT },
    skip: !showDropdown,
    fetchPolicy: 'network-only',
  })

  const results = useMemo(
    () => (data?.workbenchJobSearch ?? []).filter(isNonNullable),
    [data?.workbenchJobSearch]
  )

  useClickOutside(ref, () => setOpen(false))

  return (
    <SearchWrapperSC ref={ref}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search jobs"
        startIcon={<MagnifyingGlassIcon color="icon-light" />}
        showClearButton
        width="100%"
      />
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
              {results.map((result) => (
                <WorkbenchJobSearchResultRow
                  key={result.id}
                  result={result}
                  workbenchId={workbenchId}
                  onNavigate={() => setOpen(false)}
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
  result,
  workbenchId,
  onNavigate,
}: {
  result: WorkbenchJobSearchResultFragment
  workbenchId: string
  onNavigate: () => void
}) {
  const theme = useTheme()
  const prs = useMemo(
    () =>
      (result.pullRequests ?? [])
        .filter(isNonNullable)
        .filter((pr) => pr.url || pr.title)
        .map(
          (pr, index): PullRequestBasicFragment => ({
            __typename: 'PullRequest',
            id: pr.url ?? `${result.id}-pr-${index}`,
            title: pr.title,
            url: pr.url ?? '',
            creator: null,
            status: null,
            insertedAt: null,
            updatedAt: null,
          })
        ),
    [result.id, result.pullRequests]
  )

  return (
    <ResultRowSC
      to={getWorkbenchJobAbsPath({ workbenchId, jobId: result.id })}
      onClick={onNavigate}
    >
      <WorkbenchStoredPromptMarkdown
        text={result.prompt ?? ''}
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
        <JobConclusionIcon
          result={{ id: result.id, conclusion: result.conclusion }}
        />
        <RunStatusIcon
          fullColor
          status={result.status}
        />
        <CaretRightIcon color="icon-xlight" />
      </div>
    </ResultRowSC>
  )
}

const SearchWrapperSC = styled.div({
  position: 'relative',
  width: '100%',
  maxWidth: 480,
})

const DropdownSC = styled(Card)(({ theme }) => ({
  position: 'absolute',
  top: `calc(100% + ${theme.spacing.xsmall}px)`,
  left: 0,
  right: 0,
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
