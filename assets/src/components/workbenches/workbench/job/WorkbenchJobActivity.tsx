import {
  AccordionItem,
  ChecklistCheckedIcon,
  CheckOutlineIcon,
  CloudLoggingIcon,
  FailedFilledIcon,
  Flex,
  IconProps,
  InfrastructureIcon,
  NotebookIcon,
  SpinnerAlt,
  TicketIcon,
  ToolKitIcon,
  UnknownIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P, OverlineH3 } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobProgressFragment,
} from 'generated/graphql'
import { ComponentType } from 'react'
import { useTheme } from 'styled-components'

export function WorkbenchJobActivity({
  activity,
  progress,
}: {
  activity: WorkbenchJobActivityFragment
  progress: WorkbenchJobProgressFragment[]
}) {
  const { spacing } = useTheme()
  const isRunning = isActivityRunning(activity.status)
  const TypeIcon =
    activityTypeToIcon[activity.type ?? WorkbenchJobActivityType.Integration]
  return (
    <AccordionItem
      key={activity.id}
      value={activity.id}
      caret="left"
      padding="compact"
      paddingArea="trigger-only"
      trigger={
        <StretchedFlex gap="small">
          <OverlineH3
            $color="text-primary-disabled"
            $shimmer={isRunning}
            css={{ display: 'flex', alignItems: 'center', gap: spacing.xsmall }}
          >
            <TypeIcon
              size={12}
              color="icon-xlight"
            />
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
          <strong>Prompt:</strong> {activity.prompt}
        </Body2P>
        {activity.result?.output && (
          <Body2P $color="text-light">
            <strong>Output:</strong>{' '}
            <SimplifiedMarkdown text={activity.result.output} />
          </Body2P>
        )}
        {/* TODO */}
        {progress.map((p, i) => (
          <Body2P key={i}>{p.text}</Body2P>
        ))}
      </Flex>
    </AccordionItem>
  )
}

const activityTypeToIcon: Record<
  WorkbenchJobActivityType,
  ComponentType<IconProps>
> = {
  [WorkbenchJobActivityType.Coding]: CloudLoggingIcon,
  [WorkbenchJobActivityType.Infrastructure]: InfrastructureIcon,
  [WorkbenchJobActivityType.Memo]: NotebookIcon,
  [WorkbenchJobActivityType.Observability]: VisualInspectionIcon,
  [WorkbenchJobActivityType.Plan]: ChecklistCheckedIcon,
  [WorkbenchJobActivityType.Ticketing]: TicketIcon,
  [WorkbenchJobActivityType.Integration]: ToolKitIcon,
} as const satisfies Record<WorkbenchJobActivityType, ComponentType<IconProps>>

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
        <CheckOutlineIcon
          size={12}
          color="icon-success"
        />
      )
    case WorkbenchJobActivityStatus.Failed:
      return (
        <FailedFilledIcon
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
