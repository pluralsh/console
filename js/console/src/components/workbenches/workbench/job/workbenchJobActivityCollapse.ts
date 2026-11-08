import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'

export const isActivityTerminal = (
  status: Nullable<WorkbenchJobActivityStatus>
) =>
  status === WorkbenchJobActivityStatus.Successful ||
  status === WorkbenchJobActivityStatus.Failed ||
  status === WorkbenchJobActivityStatus.Rejected

export const CODING_AGENT_TOOL_NAME = 'workbench_coding_agent'

/**
 * A coding agent run spawned directly by the orchestrator, rather than within a coding subagent.
 * The activity is created just before its run, so `agentRun` can briefly be missing.
 */
export const isCodingAgentActivity = ({
  type,
  toolCall,
}: Pick<WorkbenchJobActivityFragment, 'type' | 'toolCall'>) =>
  type === WorkbenchJobActivityType.Coding &&
  toolCall?.name === CODING_AGENT_TOOL_NAME
