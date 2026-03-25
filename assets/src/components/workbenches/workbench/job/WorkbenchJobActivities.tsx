import {
  Card,
  CheckIcon,
  CliIcon,
  EmptyState,
  ErrorIcon,
  Flex,
  SpinnerAlt,
  ToolKitIcon,
  UnknownIcon,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  StepperAccordionItemSC,
  StepperAccordionSC,
} from 'components/utils/StepperAccordion'
import { Body2P, OverlineH3 } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { useMemo } from 'react'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

const ACTIVITY_GAP = 'medium' as const

function isActivityRunning(status: WorkbenchJobActivityStatus) {
  return (
    status === WorkbenchJobActivityStatus.Pending ||
    status === WorkbenchJobActivityStatus.Running
  )
}

export function WorkbenchJobActivities({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const { spacing, colors, borders, borderRadiuses } = useTheme()

  const activities = useMemo(
    () => mapExistingNodes(job?.activities),
    [job?.activities]
  )

  const hasActivities = !!activities.length

  const activityIdList = useMemo(
    () => activities.map((activity) => activity.id),
    [activities]
  )

  const defaultOpenIds = useMemo(
    () =>
      activities
        .filter((activity) => isActivityRunning(activity.status))
        .map((activity) => activity.id),
    [activities]
  )

  if (loading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
      />
    )

  return (
    <ActivitiesPanelSC>
      <JobPromptCardSC>{job?.prompt || 'Workbench job'}</JobPromptCardSC>
      {!hasActivities ? (
        <EmptyState message="No activities have started yet." />
      ) : (
        <StepperAccordionSC
          type="multiple"
          $gap={ACTIVITY_GAP}
          key={activityIdList.join('-')}
          defaultValue={defaultOpenIds}
        >
          {activities.map((activity) => {
            const isRunning = isActivityRunning(activity.status)

            return (
              <StepperAccordionItemSC
                key={activity.id}
                value={activity.id}
                caret="left"
                padding="compact"
                paddingArea="trigger-only"
                $gap={ACTIVITY_GAP}
                {...(isRunning && { $dotColor: 'icon-primary' })}
                triggerWrapperStyles={{
                  border: borders.default,
                  borderRadius: borderRadiuses.medium,
                  backgroundColor: colors[isRunning ? 'fill-one' : 'fill-zero'],
                }}
                trigger={
                  <StretchedFlex gap="small">
                    <OverlineH3 $shimmer={isRunning}>
                      <ActivityTypeIcon type={activity.type} />
                      <span>{activity.type?.toLowerCase() ?? 'activity'}</span>
                    </OverlineH3>
                    <ActivityStatusIcon status={activity.status} />
                  </StretchedFlex>
                }
              >
                <Flex
                  direction="column"
                  gap="xsmall"
                  maxHeight={220}
                  overflow="auto"
                  css={{ padding: `${spacing.xsmall}px ${spacing.medium}px` }}
                >
                  <Body2P $color="text-light">
                    {activity.prompt || 'Running activity'}
                  </Body2P>
                </Flex>
              </StepperAccordionItemSC>
            )
          })}
        </StepperAccordionSC>
      )}
    </ActivitiesPanelSC>
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

const ActivitiesPanelSC = styled.div(({ theme }) => ({
  position: 'relative',
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
  overflow: 'auto',
}))

const JobPromptCardSC = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))
