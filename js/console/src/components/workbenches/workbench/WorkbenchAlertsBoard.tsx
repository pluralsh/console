import { Card, ErrorIcon, Flex } from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { AlertSourceLink } from 'components/utils/alerts/AlertSourceLink'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import {
  BoardLoadingOrEmpty,
  BoardSC,
  BoardSectionSC,
  BoardTitleSC,
  CardRaisedSC,
  CardTargetButtonSC,
  clickableCardStyles,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import { AlertFragment, AlertState } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { WorkbenchAlertFlyover } from './WorkbenchAlertFlyover'
import { WorkbenchJobCardGridSC } from './WorkbenchJobCard'

export function WorkbenchAlertsBoard({
  alerts,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  fallbackWorkbenchId,
}: {
  alerts: AlertFragment[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId: string
}) {
  const loadMore = useBoardLoadMore({
    fetchingMore,
    hasNextPage,
    fetchNextPage,
  })
  // by id, so the quick view follows polled updates of the alert
  const [openAlertId, setOpenAlertId] = useState<string>()
  const openAlert = alerts.find(({ id }) => id === openAlertId)

  // forget an alert that left the list, so it can't reopen on a later poll
  if (openAlertId && !openAlert) setOpenAlertId(undefined)
  const firing = useMemo(
    () => alerts.filter(({ state }) => state === AlertState.Firing),
    [alerts]
  )

  if (isEmpty(alerts))
    return (
      <BoardLoadingOrEmpty
        loading={loading}
        message="No alerts found."
      />
    )

  return (
    <BoardSC>
      {!isEmpty(firing) && (
        <BoardSectionSC>
          <SectionTitleSC>
            <ErrorIcon
              size={16}
              color="icon-danger"
            />
            <BoardTitleSC>Firing</BoardTitleSC>
          </SectionTitleSC>
          <WorkbenchJobCardGridSC>
            {firing.map((alert) => (
              <WorkbenchAlertCard
                key={alert.id}
                alert={alert}
                onOpen={() => setOpenAlertId(alert.id)}
              />
            ))}
          </WorkbenchJobCardGridSC>
        </BoardSectionSC>
      )}
      <BoardSectionSC>
        <BoardTitleSC>All alerts</BoardTitleSC>
        <WorkbenchJobCardGridSC>
          {alerts.map((alert) => (
            <WorkbenchAlertCard
              key={alert.id}
              alert={alert}
              onOpen={() => setOpenAlertId(alert.id)}
            />
          ))}
        </WorkbenchJobCardGridSC>
      </BoardSectionSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
      <WorkbenchAlertFlyover
        alert={openAlert}
        fallbackWorkbenchId={fallbackWorkbenchId}
        onClose={() => setOpenAlertId(undefined)}
      />
    </BoardSC>
  )
}

function WorkbenchAlertCard({
  alert,
  onOpen,
}: {
  alert: AlertFragment
  onOpen: () => void
}) {
  return (
    <CardSC fillLevel={1}>
      <CardTargetButtonSC
        type="button"
        aria-label={`Show details of ${alert.title ?? 'alert'}`}
        onClick={onOpen}
      />
      <Flex
        align="center"
        justify="space-between"
        gap="xsmall"
        minHeight={16}
      >
        {alert.workbenchJob ? (
          <RunStatusIcon
            fullColor
            size="medium"
            status={alert.workbenchJob.status}
          />
        ) : (
          <span />
        )}
        <AgeSC>{fromNow(alert.updatedAt)}</AgeSC>
      </Flex>
      <TitleSC>{alert.title}</TitleSC>
      <Flex
        align="center"
        justify="space-between"
        gap="xsmall"
        minWidth={0}
      >
        <CardRaisedSC css={{ display: 'flex', minWidth: 0 }}>
          <AlertSourceLink alert={alert} />
        </CardRaisedSC>
        <AlertStateChip
          state={alert.state}
          css={{ flexShrink: 0 }}
        />
      </Flex>
    </CardSC>
  )
}

const SectionTitleSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
}))

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
  minWidth: 0,
  ...clickableCardStyles(theme),
}))

const AgeSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const TitleSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  margin: 0,
  height: 44,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  wordBreak: 'break-word',
  color: theme.colors['text-light'],
}))
