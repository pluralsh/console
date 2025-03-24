import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { AI_ABS_PATH, AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'

const breadcrumbs: Breadcrumb[] = [
  { label: 'plural-ai', url: AI_ABS_PATH },
  { label: 'mcp-servers', url: AI_MCP_SERVERS_ABS_PATH },
]

export function McpServers() {
  useSetBreadcrumbs(breadcrumbs)
  return <div>MCP servers</div>
}
