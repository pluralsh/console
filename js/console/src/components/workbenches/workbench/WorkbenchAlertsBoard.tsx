import {
  Card,
  EmptyState,
  ErrorIcon,
  Flex,
  Spinner,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { AlertSourceLink } from 'components/utils/alerts/AlertSourceLink'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import {
  BoardSC,
  BoardTitleSC,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import { AlertFragment, AlertState } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { WorkbenchJobCardGridSC } from './WorkbenchJobCard'

export function WorkbenchAlertsBoard({
  alerts,
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  alerts: AlertFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })
  const firing = useMemo(
    () => alerts.filter(({ state }) => state === AlertState.Firing),
    [alerts]
  )

  if (isEmpty(alerts)) {
    return loading ? (
      <LoadingSC>
        <Spinner />
      </LoadingSC>
    ) : (
      <EmptyState message="No alerts found." />
    )
  }

  return (
    <BoardSC>
      {!isEmpty(firing) && (
        <SectionSC>
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
              />
            ))}
          </WorkbenchJobCardGridSC>
        </SectionSC>
      )}
      <SectionSC>
        <BoardTitleSC>All alerts</BoardTitleSC>
        <WorkbenchJobCardGridSC>
          {alerts.map((alert) => (
            <WorkbenchAlertCard
              key={alert.id}
              alert={alert}
            />
          ))}
        </WorkbenchJobCardGridSC>
      </SectionSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

function WorkbenchAlertCard({ alert }: { alert: AlertFragment }) {
  return (
    <CardSC fillLevel={1}>
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
        <AlertSourceLink alert={alert} />
        <AlertStateChip
          state={alert.state}
          css={{ flexShrink: 0 }}
        />
      </Flex>
    </CardSC>
  )
}

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  paddingBottom: theme.spacing.large,
}))

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

const LoadingSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
