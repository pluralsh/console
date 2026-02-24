export const FLOWS_ABS_PATH = '/flows'
/** Route param: UUID (flow id) or flow name; same segment supports both. */
export const FLOW_PARAM_ID_OR_NAME = 'flowIdOrName'
export const FLOW_ABS_PATH = `${FLOWS_ABS_PATH}/:${FLOW_PARAM_ID_OR_NAME}`

export const FLOW_MCP_CONNECTIONS_REL_PATH = 'mcp-connections'

export function getFlowDetailsPath({
  flowIdOrName,
}: {
  flowIdOrName: Nullable<string>
}) {
  return `${FLOWS_ABS_PATH}/${flowIdOrName ?? ''}`
}
