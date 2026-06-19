import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { WorkbenchJobTinyFragment } from 'generated/graphql'

export function WorkbenchJobCardStatus({
  job,
}: {
  job: Pick<WorkbenchJobTinyFragment, 'status'>
}) {
  return (
    <RunStatusIcon
      fullColor
      status={job.status}
    />
  )
}
