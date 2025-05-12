export const FLOWS_ABS_PATH = '/flows'
export const FLOW_PARAM_ID = 'flowId'
export const FLOW_ABS_PATH = `${FLOWS_ABS_PATH}/:${FLOW_PARAM_ID}`

export const FLOW_MCP_CONNECTIONS_REL_PATH = 'mcp-connections'

export function getFlowDetailsPath({ flowId }: { flowId: Nullable<string> }) {
  return `${FLOWS_ABS_PATH}/${flowId ?? ''}`
}
