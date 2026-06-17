import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { AgentRunStatus, WorkbenchJobTinyFragment } from 'generated/graphql'
import {
  getWorkbenchJobDisplayStatus,
  isWorkbenchJobPendingApproval,
} from './workbenchJobStatus'

export function WorkbenchJobCardStatus({
  job,
}: {
  job: Pick<WorkbenchJobTinyFragment, 'status' | 'activities'>
}) {
  const status = getWorkbenchJobDisplayStatus(job)

  if (isWorkbenchJobPendingApproval(job)) {
    return (
      <RunStatusChip
        size="small"
        status={AgentRunStatus.PendingApproval}
      />
    )
  }

  return (
    <RunStatusIcon
      fullColor
      status={status}
    />
  )
}
