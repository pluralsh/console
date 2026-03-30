import {
  CheckIcon,
  CliIcon,
  ErrorIcon,
  Flex,
  SpinnerAlt,
  ToolKitIcon,
  UnknownIcon,
} from '@pluralsh/design-system'
import { StepperAccordionItemSC } from 'components/utils/StepperAccordion'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P, OverlineH3 } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobProgressFragment,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { ACTIVITY_GAP } from './WorkbenchJobActivities'

export function WorkbenchJobActivity({
  activity,
  progress,
  isLast,
}: {
  activity: WorkbenchJobActivityFragment
  progress: WorkbenchJobProgressFragment[]
  isLast?: boolean
}) {
  const { colors, spacing, borders, borderRadiuses } = useTheme()
  const isRunning = isActivityRunning(activity.status)

  return (
    <StepperAccordionItemSC
      key={activity.id}
      value={activity.id}
      caret="left"
      padding="compact"
      paddingArea="trigger-only"
      $gap={ACTIVITY_GAP}
      $isLast={isLast}
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
        {/* TODO */}
        {progress.map((p, i) => (
          <Body2P key={i}>{p.text}</Body2P>
        ))}
      </Flex>
    </StepperAccordionItemSC>
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

export const isActivityRunning = (status: WorkbenchJobActivityStatus) =>
  status === WorkbenchJobActivityStatus.Pending ||
  status === WorkbenchJobActivityStatus.Running
