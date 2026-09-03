import {
  CancelledFilledIcon,
  Card,
  CheckRoundedIcon,
  CircleDashIcon,
  Flex,
  Spinner,
} from '@pluralsh/design-system'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { CaptionP } from 'components/utils/typography/Text'
import { IssueStatus, WorkbenchIssueFragment } from 'generated/graphql'
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import {
  groupIssuesByStatus,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from 'components/workbenches/workbench/workbenchIssuesDisplay'

const statusToIcon: Record<IssueStatus, ReactNode> = {
  [IssueStatus.Open]: (
    <CircleDashIcon
      size={16}
      color="icon-xlight"
    />
  ),
  [IssueStatus.InProgress]: (
    <CircleDashIcon
      size={16}
      color="icon-info"
    />
  ),
  [IssueStatus.Completed]: (
    <CheckRoundedIcon
      size={16}
      color="icon-success"
    />
  ),
  [IssueStatus.Cancelled]: (
    <CancelledFilledIcon
      size={16}
      color="icon-danger"
    />
  ),
}

export function WorkbenchIssuesBoard({
  issues,
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  issues: WorkbenchIssueFragment[]
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
    <BoardSC>
      {ISSUE_STATUS_OPTIONS.map((status) => (
        <ColumnSC key={status}>
          <ColumnTitleSC>{ISSUE_STATUS_LABELS[status]}</ColumnTitleSC>
          <CardsSC>
            {grouped[status].map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
              />
            ))}
            {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
          </CardsSC>
        </ColumnSC>
      ))}
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
        {statusToIcon[issue.status]}
        <CaptionP $color="text-xlight">
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

  return <div ref={ref} />
}

const BoardSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(156px, 1fr))',
  gap: theme.spacing.medium,
  flex: 1,
  minHeight: 0,
  overflowX: 'auto',
}))

const ColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  minWidth: 0,
  minHeight: 0,
}))

const ColumnTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  margin: 0,
  color: theme.colors.text,
  flexShrink: 0,
}))

const CardsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
  overflowY: 'auto',
  paddingBottom: theme.spacing.small,
}))

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
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

const LoadingSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 160,
})
