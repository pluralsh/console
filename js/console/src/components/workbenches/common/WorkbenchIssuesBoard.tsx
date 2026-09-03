import { Card, Flex, Spinner } from '@pluralsh/design-system'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import { CaptionP } from 'components/utils/typography/Text'
import { IssueStatus, WorkbenchIssueFragment } from 'generated/graphql'
import { includes, isEmpty, isNil } from 'lodash'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import {
  groupIssuesByStatus,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from './issueStatus'

export function WorkbenchIssuesBoard({
  issues,
  statuses,
  loading,
  hasNextPage,
  fetchNextPage,
  fallbackWorkbenchId,
}: {
  issues: WorkbenchIssueFragment[]
  statuses: IssueStatus[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId?: string
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

  if (loading && isEmpty(issues)) {
    return (
      <LoadingSC>
        <Spinner />
      </LoadingSC>
    )
  }

  return (
    <BoardSC $columnCount={statuses.length}>
      {ISSUE_STATUS_OPTIONS.filter((status) => includes(statuses, status)).map(
        (status) => (
          <ColumnSC key={status}>
            <ColumnTitleSC>{ISSUE_STATUS_LABELS[status]}</ColumnTitleSC>
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
        )
      )}
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

function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (isNil(element)) return

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
    gridTemplateColumns: `repeat(${Math.max($columnCount, 1)}, minmax(0, 1fr))`,
    columnGap: theme.spacing.medium,
    rowGap: 0,
    flex: 1,
    width: '100%',
    minWidth: 0,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
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
  width: '100%',
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
