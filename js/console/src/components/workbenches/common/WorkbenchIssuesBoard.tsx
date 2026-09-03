import {
  Card,
  CheckRoundedIcon,
  FailedFilledIcon,
  Flex,
  Spinner,
  SpinnerAlt,
  UnknownIcon,
} from '@pluralsh/design-system'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { CaptionP } from 'components/utils/typography/Text'
import {
  IssueStatus,
  WorkbenchIssueFragment,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import {
  groupIssuesByStatus,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from './issueStatus'

function jobStatusIcon(status?: Nullable<WorkbenchJobStatus>): ReactNode {
  switch (status) {
    case WorkbenchJobStatus.Pending:
    case WorkbenchJobStatus.Running:
      return <SpinnerAlt size={16} />
    case WorkbenchJobStatus.Successful:
      return (
        <CheckRoundedIcon
          size={16}
          color="icon-success"
        />
      )
    case WorkbenchJobStatus.Failed:
      return (
        <FailedFilledIcon
          size={16}
          color="icon-danger"
        />
      )
    default:
      return (
        <UnknownIcon
          size={16}
          color="icon-xlight"
        />
      )
  }
}

export function WorkbenchIssuesBoard({
  issues,
  statuses,
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  issues: WorkbenchIssueFragment[]
  statuses: IssueStatus[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const grouped = useMemo(() => groupIssuesByStatus(issues), [issues])
  const fetchingRef = useRef(false)
  const loadMore = useCallback(() => {
    if (fetchingRef.current || loading || !hasNextPage) return
    fetchingRef.current = true
    fetchNextPage()
  }, [fetchNextPage, hasNextPage, loading])

  useEffect(() => {
    if (!loading) fetchingRef.current = false
  }, [loading])

  if (loading && issues.length === 0) {
    return (
      <LoadingSC>
        <Spinner />
      </LoadingSC>
    )
  }

  return (
    <BoardSC $columnCount={statuses.length}>
      {ISSUE_STATUS_OPTIONS.filter((status) => statuses.includes(status)).map(
        (status) => (
          <ColumnSC key={status}>
            <ColumnTitleSC>{ISSUE_STATUS_LABELS[status]}</ColumnTitleSC>
            <CardsSC>
              {grouped[status].length > 0 ? (
                grouped[status].map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                  />
                ))
              ) : (
                <EmptyColumnCard />
              )}
            </CardsSC>
          </ColumnSC>
        )
      )}
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

function IssueCard({ issue }: { issue: WorkbenchIssueFragment }) {
  return (
    <CardSC fillLevel={1}>
      <Flex
        justify="space-between"
        align="center"
        gap="xsmall"
      >
        {jobStatusIcon(issue.workbenchJob?.status)}
        <CaptionP
          $color="text-xlight"
          css={{ margin: 0 }}
        >
          {issue.insertedAt ? fromNow(issue.insertedAt) : ''}
        </CaptionP>
      </Flex>
      <TitleSC>{issue.title}</TitleSC>
      <IssueLink
        url={issue.url}
        provider={issue.provider}
      />
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

function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onVisible()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [onVisible])

  return <LoadMoreSentinelSC ref={ref} />
}

const BoardSC = styled.div<{ $columnCount: number }>(
  ({ theme, $columnCount }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max($columnCount, 1)}, minmax(250px, 1fr))`,
    gap: theme.spacing.medium,
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  })
)

const ColumnSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
})

const ColumnTitleSC = styled.h2(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: 0,
  margin: 0,
  paddingBottom: theme.spacing.xsmall,
  color: theme.colors.text,
  backgroundColor: theme.colors['fill-zero'],
  flexShrink: 0,
}))

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
  color: theme.colors['text-light'],
}))

const LoadMoreSentinelSC = styled.div({
  gridColumn: '1 / -1',
  height: 1,
})

const LoadingSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 160,
})
