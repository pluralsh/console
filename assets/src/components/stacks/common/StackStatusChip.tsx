import { ComponentProps } from 'react'
import { Chip, ChipProps, Flex } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'

import { AiInsightSummaryFragment, StackStatus } from 'generated/graphql'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import {
  getStackRunsAbsPath,
  STACK_RUNS_INSIGHTS_REL_PATH,
} from 'routes/stacksRoutesConsts'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

const statusToSeverity = {
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

export default function StackStatusChip({
  status,
  deleting = false,
  insight,
  stackId,
  runId,
  ...props
}: {
  status?: StackStatus
  deleting?: boolean
} & ChipProps &
  (
    | {
        insight?: never
        stackId?: never
        runId?: never
      }
    | {
        insight: Nullable<AiInsightSummaryFragment>
        stackId: string
        runId: string
      }
  )) {
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
        {ai?.enabled && insight && stackId && runId && (
          <AiInsightSummaryIcon
            size="small"
            navPath={`${getStackRunsAbsPath(stackId, runId)}/${STACK_RUNS_INSIGHTS_REL_PATH}`}
            insight={insight}
          />
        )}
        {deleting
          ? 'Deleting'
          : status === StackStatus.PendingApproval
            ? 'Pending Approval'
            : status === StackStatus.Successful
              ? 'Succeeded'
              : capitalize(status)}
      </Flex>
    </Chip>
  )
}

export { statusToSeverity }
