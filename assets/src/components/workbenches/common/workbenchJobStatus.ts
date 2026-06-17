import {
  AgentRunStatus,
  WorkbenchJobStatus,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { mapExistingNodes } from 'utils/graphql'

export type WorkbenchJobDisplayStatus = AgentRunStatus | WorkbenchJobStatus

export function getWorkbenchJobDisplayStatus(
  job: Pick<WorkbenchJobTinyFragment, 'status' | 'activities'>
): WorkbenchJobDisplayStatus {
  // TODO: Use job.status once WorkbenchJobStatus has PENDING_APPROVAL.
  if (job.status === ('PENDING_APPROVAL' as WorkbenchJobStatus)) {
    return AgentRunStatus.PendingApproval
  }

  const hasPendingApproval = mapExistingNodes(job.activities).some(
    (activity) =>
      activity.agentRun?.status === AgentRunStatus.PendingApproval ||
      activity.agentRuns?.some(
        (run) => run?.status === AgentRunStatus.PendingApproval
      )
  )

  if (hasPendingApproval) return AgentRunStatus.PendingApproval

  return job.status
}

export function isWorkbenchJobPendingApproval(
  job: Pick<WorkbenchJobTinyFragment, 'status' | 'activities'>
): boolean {
  return getWorkbenchJobDisplayStatus(job) === AgentRunStatus.PendingApproval
}
