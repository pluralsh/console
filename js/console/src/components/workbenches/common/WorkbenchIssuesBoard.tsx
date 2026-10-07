import { Card, Flex, Spinner } from '@pluralsh/design-system'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import { CaptionP } from 'components/utils/typography/Text'
import { IssueStatus, WorkbenchIssueFragment } from 'generated/graphql'
import { includes, isEmpty } from 'lodash'
import { useMemo } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import {
  BoardCenteredSC,
  BoardSC,
  BoardTitleSC,
  LoadMoreSentinel,
  useBoardLoadMore,
} from './WorkbenchBoard'
import {
  groupIssuesByStatus,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from './issueStatus'

export function WorkbenchIssuesBoard({
  issues,
  statuses,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  fallbackWorkbenchId,
}: {
  issues: WorkbenchIssueFragment[]
  statuses: IssueStatus[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId?: string
}) {
  const grouped = useMemo(() => groupIssuesByStatus(issues), [issues])
  const loadMore = useBoardLoadMore({
    fetchingMore,
    hasNextPage,
    fetchNextPage,
  })

  const visibleStatuses = useMemo(
    () => ISSUE_STATUS_OPTIONS.filter((status) => includes(statuses, status)),
    [statuses]
  )

  if (loading && isEmpty(issues)) {
    return (
      <BoardCenteredSC>
        <Spinner />
      </BoardCenteredSC>
    )
  }

  return (
    <BoardSC>
      <HeaderBandSC $columnCount={visibleStatuses.length}>
        {visibleStatuses.map((status) => (
          <BoardTitleSC key={status}>
            {ISSUE_STATUS_LABELS[status]}
          </BoardTitleSC>
        ))}
      </HeaderBandSC>
      <ColumnsRowSC $columnCount={visibleStatuses.length}>
        {visibleStatuses.map((status) => (
          <ColumnSC key={status}>
            <CardsSC>
              {!isEmpty(grouped[status]) ? (
                grouped[status].map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    fallbackWorkbenchId={fallbackWorkbenchId}
                  />
                ))
              ) : (
                <EmptyColumnCard />
              )}
            </CardsSC>
          </ColumnSC>
        ))}
      </ColumnsRowSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

function IssueCard({
  issue,
  fallbackWorkbenchId,
}: {
  issue: WorkbenchIssueFragment
  fallbackWorkbenchId?: string
}) {
  const workbenchId = issue.workbench?.id ?? fallbackWorkbenchId
  const workbenchJobId = issue.workbenchJob?.id

  return (
    <CardSC fillLevel={1}>
      <Flex
        justify="space-between"
        align="center"
        gap="xsmall"
      >
        <IssueLink
          url={issue.url}
          provider={issue.provider}
        />
        <CaptionP
          $color="text-xlight"
          css={{ flexShrink: 0, margin: 0 }}
        >
          {issue.insertedAt ? fromNow(issue.insertedAt) : ''}
        </CaptionP>
      </Flex>
      <TitleSC>{issue.title}</TitleSC>
      {workbenchId && workbenchJobId && (
        <WorkbenchViewJobChip
          workbenchId={workbenchId}
          jobId={workbenchJobId}
          status={issue.workbenchJob?.status}
          css={{ alignSelf: 'flex-end' }}
        />
      )}
    </CardSC>
  )
}

function EmptyColumnCard() {
  return (
    <EmptyCardSC>
      <EmptyCardTextSC>
        No tickets available in this status yet.
      </EmptyCardTextSC>
    </EmptyCardSC>
  )
}

function boardGrid(columnCount: number) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max(columnCount, 1)}, minmax(0, 1fr))`,
  } as const
}

const HeaderBandSC = styled.div<{ $columnCount: number }>(
  ({ theme, $columnCount }) => ({
    ...boardGrid($columnCount),
    columnGap: theme.spacing.medium,
    position: 'sticky',
    top: 0,
    zIndex: 1,
    flexShrink: 0,
    paddingBottom: theme.spacing.xsmall,
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors['page-background']
        : theme.colors['fill-zero'],
  })
)

const ColumnsRowSC = styled.div<{ $columnCount: number }>(
  ({ theme, $columnCount }) => ({
    ...boardGrid($columnCount),
    columnGap: theme.spacing.medium,
    minWidth: 0,
  })
)

const ColumnSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
})

const CardsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  alignItems: 'stretch',
  paddingBottom: theme.spacing.small,
}))

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
  boxSizing: 'border-box',
  width: '100%',
  overflow: 'hidden',
  flexShrink: 0,
}))

const TitleSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  margin: 0,
  color: theme.colors['text-light'],
  height: 44,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
}))

const EmptyCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  boxSizing: 'border-box',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
  minHeight: 130,
  width: '100%',
  flexShrink: 0,
  overflow: 'hidden',
  backgroundColor: 'transparent',
  border: `1px dashed ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.large,
}))

const EmptyCardTextSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  margin: 0,
  width: '100%',
  color: theme.colors['text-light'],
}))
