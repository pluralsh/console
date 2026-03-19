import {
  CaretDownIcon,
  CheckIcon,
  CliIcon,
  EmptyState,
  ErrorIcon,
  Flex,
  SpinnerAlt,
  ToolKitIcon,
  UnknownIcon,
} from '@pluralsh/design-system'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from '../../../../generated/graphql'
import { useState } from 'react'
import { RectangleSkeleton } from '../../../utils/SkeletonLoaders'
import { CaptionP } from '../../../utils/typography/Text'
import { WorkbenchProgressMap } from './workbenchRunMockData'
import styled from 'styled-components'

type WorkbenchRunActivitiesState = 'empty' | 'running' | 'finished'

const terminalStatuses = new Set([
  WorkbenchJobActivityStatus.Successful,
  WorkbenchJobActivityStatus.Failed,
  WorkbenchJobActivityStatus.Cancelled,
])

function resolveActivitiesState(
  activities?: Array<WorkbenchJobActivityFragment>
): WorkbenchRunActivitiesState {
  if (!activities?.length) return 'empty'

  const hasActive = activities.some(
    (activity) =>
      activity.status === WorkbenchJobActivityStatus.Pending ||
      activity.status === WorkbenchJobActivityStatus.Running
  )
  if (hasActive) return 'running'

  const allFinished = activities.every((activity) =>
    terminalStatuses.has(activity.status)
  )
  if (allFinished) return 'finished'

  return 'empty'
}

function isActivityRunning(status: WorkbenchJobActivityStatus) {
  return (
    status === WorkbenchJobActivityStatus.Pending ||
    status === WorkbenchJobActivityStatus.Running
  )
}

export function WorkbenchRunActivities({
  loading,
  activities,
  progressByActivityId,
  state,
}: {
  loading: boolean
  activities?: Array<WorkbenchJobActivityFragment>
  progressByActivityId: WorkbenchProgressMap
  state?: WorkbenchRunActivitiesState
}) {
  const resolvedState = state ?? resolveActivitiesState(activities)
  const [expanded, setExpanded] = useState(true)
  const [activityExpanded, setActivityExpanded] = useState<
    Record<string, boolean>
  >({})
  const hasActivities = !!activities?.length
  const runningCount =
    activities?.filter((activity) => isActivityRunning(activity.status))
      .length ?? 0

  const summaryText = hasActivities
    ? runningCount > 0
      ? `${runningCount} activities running`
      : resolvedState === 'finished'
        ? `${activities.length} activities complete`
        : `${activities.length} activities`
    : 'No activities yet'

  return loading ? (
    <RectangleSkeleton
      css={{
        flex: 1,
      }}
      $width="100%"
      $height="100%"
    />
  ) : (
    <ActivitiesPanelSC $isRunning={resolvedState === 'running'}>
      {hasActivities && (
        <ActivitiesSummaryButtonSC
          onClick={() => setExpanded((value) => !value)}
        >
          <Flex
            align="center"
            gap="xsmall"
          >
            <CaretDownIcon
              size={12}
              color="icon-xlight"
              css={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 180ms ease',
              }}
            />
            <SummaryTextSC>{summaryText}</SummaryTextSC>
          </Flex>
          <ActivitySummaryStatus state={resolvedState} />
        </ActivitiesSummaryButtonSC>
      )}
      {!hasActivities ? (
        <EmptyWrapSC>
          <EmptyState message="No activities have started yet." />
        </EmptyWrapSC>
      ) : (
        <ActivitiesListWrapSC $expanded={expanded}>
          <ActivitiesContentSC>
            <RailSC>
              <RailLineSC />
              <RailHeadSC $isRunning={resolvedState === 'running'} />
              <RailTailSC />
            </RailSC>
            <CardsWrapSC>
              {expanded &&
                activities.map((activity, index) => {
                  const progress = progressByActivityId[activity.id] ?? []
                  const isActivityExpanded =
                    activityExpanded[activity.id] ??
                    (isActivityRunning(activity.status) ||
                      resolvedState === 'finished')

                  return (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      progress={progress}
                      index={index}
                      state={resolvedState}
                      expanded={isActivityExpanded}
                      onToggle={() =>
                        setActivityExpanded((prev) => ({
                          ...prev,
                          [activity.id]: !isActivityExpanded,
                        }))
                      }
                    />
                  )
                })}
            </CardsWrapSC>
          </ActivitiesContentSC>
        </ActivitiesListWrapSC>
      )}
    </ActivitiesPanelSC>
  )
}

function ActivityCard({
  activity,
  progress,
  index,
  state,
  expanded,
  onToggle,
}: {
  activity: WorkbenchJobActivityFragment
  progress: NonNullable<WorkbenchProgressMap[string]>
  index: number
  state: WorkbenchRunActivitiesState
  expanded: boolean
  onToggle: () => void
}) {
  const isRunning = isActivityRunning(activity.status)
  const showDetails = expanded && (isRunning || state === 'finished')

  return (
    <ActivityItemSC $index={index}>
      <ActivityToggleSC
        onClick={onToggle}
        $isRunning={isRunning}
      >
        <Flex
          justifyContent="space-between"
          align="center"
          gap="small"
        >
          <ActivityHeaderSC
            align="center"
            gap="xsmall"
          >
            <CaretDownIcon
              size={12}
              color="icon-xlight"
              css={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 180ms ease',
              }}
            />
            <ActivityTypeIcon type={activity.type} />
            <ActivityTypeLabelSC>
              {activity.type?.toLowerCase() ?? 'activity'}
            </ActivityTypeLabelSC>
          </ActivityHeaderSC>
          <ActivityStatusIcon status={activity.status} />
        </Flex>
      </ActivityToggleSC>

      <ActivityDetailsSC $show={showDetails}>
        <ActivityTextSC $color="text-light">
          {activity.prompt || 'Running activity'}
        </ActivityTextSC>
        {(progress.length > 0 ? progress : toFallbackOutput(activity)).map(
          (event, progressIdx) => (
            <ActivityTextSC
              key={`${activity.id}-${event.tool ?? 'output'}-${event.text}-${progressIdx}`}
              $color="text-long-form"
            >
              {event.tool ? `${event.tool}: ` : ''}
              {event.text}
            </ActivityTextSC>
          )
        )}
      </ActivityDetailsSC>
    </ActivityItemSC>
  )
}

function ActivitySummaryStatus({
  state,
}: {
  state: WorkbenchRunActivitiesState
}) {
  switch (state) {
    case 'running':
      return <SpinnerAlt size={12} />
    case 'finished':
      return (
        <CheckIcon
          size={12}
          color="icon-success"
        />
      )
    default:
      return <UnknownIcon size={12} />
  }
}

function ActivityTypeIcon({
  type,
}: {
  type: Nullable<WorkbenchJobActivityType>
}) {
  switch (type) {
    case WorkbenchJobActivityType.Coding:
      return (
        <CliIcon
          size={12}
          color="icon-xlight"
        />
      )
    case WorkbenchJobActivityType.Integration:
      return (
        <ToolKitIcon
          size={12}
          color="icon-xlight"
        />
      )
    default:
      return null
  }
}

function ActivityStatusIcon({
  status,
}: {
  status: WorkbenchJobActivityStatus
}) {
  switch (status) {
    case WorkbenchJobActivityStatus.Pending:
    case WorkbenchJobActivityStatus.Running:
      return <SpinnerAlt size={12} />
    case WorkbenchJobActivityStatus.Successful:
      return (
        <CheckIcon
          size={12}
          color="icon-success"
        />
      )
    case WorkbenchJobActivityStatus.Failed:
      return (
        <ErrorIcon
          size={12}
          color="icon-danger"
        />
      )
    default:
      return (
        <UnknownIcon
          size={12}
          color="icon-xlight"
        />
      )
  }
}

function toFallbackOutput(
  activity: WorkbenchJobActivityFragment
): Array<{ tool?: string | null; text: string }> {
  if (activity.result?.output) {
    return [{ text: activity.result.output }]
  }

  return [
    {
      text:
        activity.status === WorkbenchJobActivityStatus.Successful
          ? 'Completed successfully'
          : activity.status === WorkbenchJobActivityStatus.Failed
            ? 'Execution failed'
            : activity.status === WorkbenchJobActivityStatus.Cancelled
              ? 'Execution cancelled'
              : 'Working...',
    },
  ]
}

const ActivitiesPanelSC = styled.div<{ $isRunning: boolean }>(
  ({ $isRunning, theme }) => ({
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.medium,
    padding: `${theme.spacing.xlarge}px ${theme.spacing.large}px`,
    background:
      'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(70, 78, 255, 0.18) 100%), #0e1015',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    minHeight: 0,
    overflow: 'hidden',
    transition:
      'border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease',
    boxShadow: $isRunning
      ? `0 0 0 1px ${theme.colors['border-primary']} inset`
      : 'none',
  })
)

const ActivitiesSummaryButtonSC = styled.button(({ theme }) => ({
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-zero'],
  color: theme.colors['text-light'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  transition: 'background-color 180ms ease, border-color 180ms ease',
  '&:hover': {
    borderColor: theme.colors['border-fill-three'],
    backgroundColor: theme.colors['fill-one'],
  },
}))

const SummaryTextSC = styled.span(({ theme }) => ({
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '0.5px',
  color: theme.colors['text-light'],
}))

const EmptyWrapSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.medium}px ${theme.spacing.xsmall}px`,
  transition: 'opacity 220ms ease',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const ActivitiesListWrapSC = styled.div<{ $expanded: boolean }>(
  ({ $expanded }) => ({
    display: $expanded ? 'block' : 'none',
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  })
)

const ActivitiesContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  gap: theme.spacing.small,
}))

const RailSC = styled.div(({ theme }) => ({
  width: '18px',
  position: 'relative',
  flexShrink: 0,
  alignSelf: 'stretch',
  marginTop: theme.spacing.large + 16,
  marginBottom: theme.spacing.small + 18,
}))

const RailLineSC = styled.div(({ theme }) => ({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  top: '20px',
  bottom: '20px',
  width: '1px',
  backgroundColor: theme.colors['border-fill-three'],
  opacity: 0.9,
}))

const RailHeadSC = styled.div<{ $isRunning: boolean }>(
  ({ $isRunning, theme }) => ({
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: 0,
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: $isRunning
      ? theme.colors['border-primary']
      : theme.colors['icon-disabled'],
    boxShadow: $isRunning ? `0 0 0 2px ${theme.colors['fill-three']}` : 'none',
    transition: 'background-color 220ms ease, box-shadow 220ms ease',
    animation: $isRunning
      ? 'workbenchRailPulse 1.8s ease-in-out infinite'
      : 'none',
    '@keyframes workbenchRailPulse': {
      '0%, 100%': {
        boxShadow: `0 0 0 2px ${theme.colors['fill-three']}`,
      },
      '50%': {
        boxShadow: `0 0 0 5px ${theme.colors['fill-accent']}`,
      },
    },
  })
)

const RailTailSC = styled.div(({ theme }) => ({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 0,
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: theme.colors['icon-disabled'],
}))

const CardsWrapSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  paddingTop: theme.spacing.large,
  paddingRight: theme.spacing.xsmall,
}))

const ActivityItemSC = styled.div<{ $index: number }>(({ $index, theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  opacity: 0,
  transform: 'translateY(6px)',
  animation: `workbenchActivityIn 260ms ${$index * 40}ms ease forwards`,
  '@keyframes workbenchActivityIn': {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
}))

const ActivityToggleSC = styled.button<{ $isRunning: boolean }>(
  ({ $isRunning, theme }) => ({
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: $isRunning
      ? theme.colors['fill-one']
      : theme.colors['fill-zero'],
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    width: '100%',
    transition:
      'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
    textAlign: 'left',
    cursor: 'pointer',
  })
)

const ActivityTypeLabelSC = styled.span({})

const ActivityHeaderSC = styled(Flex)(({ theme }) => ({
  color: theme.colors['text-xlight'],
  textTransform: 'uppercase',
  letterSpacing: '1.25px',
  fontSize: '12px',
  lineHeight: '16px',
}))

const ActivityTextSC = styled(CaptionP)({
  margin: 0,
  fontSize: '16px',
  lineHeight: '24px',
  letterSpacing: '0.25px',
})

const ActivityDetailsSC = styled.div<{ $show: boolean }>(
  ({ $show, theme }) => ({
    maxHeight: $show ? '220px' : '0',
    opacity: $show ? 1 : 0,
    overflow: 'hidden',
    transition: 'max-height 220ms ease, opacity 180ms ease',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
    paddingLeft: theme.spacing.large,
    paddingRight: theme.spacing.medium,
    paddingBottom: theme.spacing.small,
  })
)
