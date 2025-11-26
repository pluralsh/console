import {
  CheckRoundedIcon,
  Chip,
  ChipProps,
  FailedFilledIcon,
  Flex,
  QueuedOutlineIcon,
  WrapWithIf,
  SpinnerAlt,
  StatusIpIcon,
  CancelledFilledIcon,
  WarningIcon,
  Tooltip,
} from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'
import { ComponentProps, ReactNode } from 'react'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import {
  AiInsightSummaryFragment,
  StackStatus,
  StackTinyFragment,
} from 'generated/graphql'
import {
  getStackRunsAbsPath,
  getStacksAbsPath,
  STACK_INSIGHTS_REL_PATH,
  STACK_RUNS_INSIGHTS_REL_PATH,
} from 'routes/stacksRoutesConsts'

export function StackStatusChip({
  status,
  deleting = false,
  insight,
  stackId,
  runId,
  ...props
}: {
  status?: StackStatus
  deleting?: boolean
  insight?: Nullable<AiInsightSummaryFragment>
  stackId?: Nullable<string>
  runId?: Nullable<string>
} & ChipProps) {
  const severity = deleting ? 'danger' : statusToSeverity[status ?? '']
  const { ai } = useDeploymentSettings()
  return (
    <Chip
      severity={severity}
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {ai?.enabled && insight && (
          <AiInsightSummaryIcon
            size="small"
            navPath={
              runId
                ? `${getStackRunsAbsPath(stackId, runId)}/${STACK_RUNS_INSIGHTS_REL_PATH}`
                : stackId
                  ? `${getStacksAbsPath(stackId)}/${STACK_INSIGHTS_REL_PATH}`
                  : undefined
            }
            insight={insight}
          />
        )}
        {deleting ? 'Deleting' : statusToLabel(status)}
      </Flex>
    </Chip>
  )
}

export function StackStatusChipAlt({ stack }: { stack: StackTinyFragment }) {
  const { id, insight, deletedAt, status } = stack
  const { ai } = useDeploymentSettings()

  if (ai?.enabled && insight)
    return (
      <StackStatusChip
        status={status}
        deleting={!!deletedAt}
        insight={insight}
        stackId={id}
      />
    )
  return (
    <WrapWithIf
      condition={!!deletedAt}
      wrapper={<DeletingChip />}
    >
      <Tooltip
        placement="top"
        label={statusToLabel(status)}
      >
        {statusToIcon[status]}
      </Tooltip>
    </WrapWithIf>
  )
}

function DeletingChip({ children }: { children?: ReactNode }) {
  return (
    <Chip>
      <Flex
        align="center"
        gap="xsmall"
      >
        {children}
        Deleting
      </Flex>
    </Chip>
  )
}
const statusToLabel = (status: Nullable<StackStatus>) =>
  !status
    ? ''
    : status === StackStatus.Successful
      ? 'Succeeded'
      : capitalize(status).replace('_', ' ')

export const statusToSeverity = {
  [StackStatus.Queued]: 'neutral',
  [StackStatus.Pending]: 'warning',
  [StackStatus.Running]: 'info',
  [StackStatus.Cancelled]: 'neutral',
  [StackStatus.Failed]: 'danger',
  [StackStatus.Successful]: 'success',
  [StackStatus.PendingApproval]: 'warning',
} as const satisfies Record<
  StackStatus,
  ComponentProps<typeof Chip>['severity']
>

const statusToIcon = {
  [StackStatus.Queued]: <QueuedOutlineIcon />,
  [StackStatus.Pending]: <StatusIpIcon />,
  [StackStatus.Running]: <SpinnerAlt size={16} />,
  [StackStatus.Cancelled]: <CancelledFilledIcon />,
  [StackStatus.Failed]: <FailedFilledIcon color="icon-danger" />,
  [StackStatus.Successful]: <CheckRoundedIcon color="icon-success" />,
  [StackStatus.PendingApproval]: <WarningIcon color="icon-warning" />,
} as const satisfies Record<StackStatus, ReactNode>
