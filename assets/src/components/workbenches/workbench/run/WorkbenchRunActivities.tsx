import {
  CaretDownIcon,
  CheckIcon,
  CliIcon,
  CloudIcon,
  EmptyState,
  ErrorIcon,
  Flex,
  SpinnerAlt,
  ToolKitIcon,
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
    <div
      css={{
        border: '1px solid #2a2e37',
        borderRadius: '6px',
        padding: '24px 20px',
        background:
          'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(70, 78, 255, 0.18) 100%), #0e1015',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
        overflow: 'hidden',
        transition:
          'border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease',
        boxShadow:
          resolvedState === 'running'
            ? '0 0 0 1px rgba(97, 112, 255, 0.15) inset'
            : 'none',
      }}
    >
      {hasActivities && (
        <button
          onClick={() => setExpanded((value) => !value)}
          css={{
            border: '1px solid #2a2e37',
            borderRadius: '6px',
            background: 'rgba(14, 16, 21, 0.7)',
            color: '#c5c9d2',
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background-color 180ms ease, border-color 180ms ease',
            '&:hover': {
              borderColor: '#3a3f4b',
              backgroundColor: 'rgba(23, 26, 33, 0.82)',
            },
          }}
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
            <span
              css={{
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '0.5px',
              }}
            >
              {summaryText}
            </span>
          </Flex>
          <ActivitySummaryStatus state={resolvedState} />
        </button>
      )}
      {!hasActivities ? (
        <div
          css={{
            padding: '12px 4px',
            transition: 'opacity 220ms ease',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EmptyState message="No activities have started yet." />
        </div>
      ) : (
        <div
          css={{
            display: expanded ? 'flex' : 'none',
            minHeight: 0,
            overflow: 'auto',
            gap: '8px',
          }}
        >
          <div
            css={{
              width: '18px',
              position: 'relative',
              flexShrink: 0,
              marginTop: '28px',
            }}
          >
            <div
              css={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '20px',
                bottom: '20px',
                width: '1px',
                backgroundColor: '#454954',
                opacity: 0.9,
              }}
            />
            <div
              css={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 0,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  resolvedState === 'running' ? '#6170ff' : '#5a5f6e',
                boxShadow:
                  resolvedState === 'running'
                    ? '0 0 0 2px rgba(97, 112, 255, 0.12)'
                    : 'none',
                transition:
                  'background-color 220ms ease, box-shadow 220ms ease',
                animation:
                  resolvedState === 'running'
                    ? 'workbenchRailPulse 1.8s ease-in-out infinite'
                    : 'none',
                '@keyframes workbenchRailPulse': {
                  '0%, 100%': {
                    boxShadow: '0 0 0 2px rgba(97, 112, 255, 0.12)',
                  },
                  '50%': {
                    boxShadow: '0 0 0 5px rgba(97, 112, 255, 0.18)',
                  },
                },
              }}
            />
            <div
              css={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'calc(100% - 8px)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#5a5f6e',
              }}
            />
          </div>
          <div
            css={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingTop: '16px',
              paddingRight: '4px',
            }}
          >
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
          </div>
        </div>
      )}
    </div>
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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: 0,
        transform: 'translateY(6px)',
        animation: `workbenchActivityIn 260ms ${index * 40}ms ease forwards`,
        '@keyframes workbenchActivityIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <button
        onClick={onToggle}
        css={{
          border: '1px solid #2a2e37',
          borderRadius: '6px',
          backgroundColor: isRunning ? '#171a21' : 'rgba(23, 26, 33, 0.72)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          transition:
            'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <Flex
          justifyContent="space-between"
          align="center"
          gap="small"
        >
          <Flex
            align="center"
            gap="xsmall"
            css={{
              color: '#a1a5b0',
              textTransform: 'uppercase',
              letterSpacing: '1.25px',
              fontSize: '12px',
              lineHeight: '16px',
            }}
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
            <span>{activity.type?.toLowerCase() ?? 'activity'}</span>
          </Flex>
          <ActivityStatusIcon status={activity.status} />
        </Flex>
      </button>

      <div
        css={{
          maxHeight: showDetails ? '220px' : '0',
          opacity: showDetails ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 220ms ease, opacity 180ms ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingLeft: '32px',
          paddingRight: '16px',
        }}
      >
        <CaptionP
          $color="text-light"
          css={{
            fontSize: '16px',
            lineHeight: '24px',
            letterSpacing: '0.25px',
            margin: 0,
          }}
        >
          {activity.prompt || 'Running activity'}
        </CaptionP>
        {(progress.length > 0 ? progress : toFallbackOutput(activity)).map(
          (event, progressIdx) => (
            <CaptionP
              key={`${activity.id}-${event.tool ?? 'output'}-${event.text}-${progressIdx}`}
              $color="text-long-form"
              css={{
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.25px',
                margin: 0,
              }}
            >
              {event.tool ? `${event.tool}: ` : ''}
              {event.text}
            </CaptionP>
          )
        )}
      </div>
    </div>
  )
}

function ActivitySummaryStatus({
  state,
}: {
  state: WorkbenchRunActivitiesState
}) {
  if (state === 'running')
    return (
      <SpinnerAlt
        size={12}
        css={{ color: '#aeb3c0' }}
      />
    )
  if (state === 'finished')
    return (
      <CheckIcon
        size={12}
        color="icon-success"
      />
    )

  return (
    <CloudIcon
      size={12}
      color="icon-xlight"
    />
  )
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
      return (
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#aeb3c0',
            transition: 'opacity 180ms ease',
          }}
        >
          <SpinnerAlt size={12} />
          <span
            css={{
              textTransform: 'lowercase',
              fontSize: '12px',
              letterSpacing: '0.4px',
            }}
          >
            {status.toLowerCase()}
          </span>
        </div>
      )
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
        <CloudIcon
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
