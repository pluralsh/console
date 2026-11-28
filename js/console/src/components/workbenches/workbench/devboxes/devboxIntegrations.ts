import {
  DevboxMcpToolFragment,
  DevboxToolCallFragment,
  Provider,
  useDevboxMcpToolsQuery,
  WorkbenchToolType,
} from 'generated/graphql'
import { createContext, useMemo } from 'react'

export type ToolIntegration = {
  type: WorkbenchToolType
  provider?: Nullable<Provider>
  // the workbench tool the call went through, when the workbench MCP served it
  workbenchToolId?: string
  workbenchToolName?: string
  // what the MCP tool does, e.g. "close pull request"
  action?: string
}

export type McpToolIndex = ReadonlyMap<string, DevboxMcpToolFragment>

export const WORKBENCH_MCP_SERVER = 'plural-workbench'

type Input = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

// Claude names MCP tools mcp__<server>__<tool>; Codex titles them <server>.<tool> and puts both in its input
const CLAUDE_MCP_TOOL = /^mcp__(.+?)__(.+)$/
const CODEX_MCP_TITLE = /^([\w-]+)\.([\w-]+)$/

// the MCP server and tool a call went to, with the arguments it passed: Claude's input is the arguments (or wraps
// them in tool_input, in permission requests); Codex's wraps them in arguments, beside server and tool
export function mcpCall(
  toolCall: DevboxToolCallFragment
): Nullable<{ server: string; tool: string; args: unknown }> {
  const input = inputOf(toolCall)
  const claude =
    CLAUDE_MCP_TOOL.exec(toolCall.title ?? '') ??
    CLAUDE_MCP_TOOL.exec(str(input.tool_name) ?? '')
  if (claude)
    return {
      server: claude[1],
      tool: claude[2],
      args: input.tool_input ?? input,
    }
  const server = str(input.server)
  const tool = str(input.tool)
  if (server && tool) return { server, tool, args: input.arguments ?? {} }
  // a Codex title alone could be any dotted name, so only the workbench server's is trusted
  const codex = CODEX_MCP_TITLE.exec(toolCall.title ?? '')
  if (codex && codex[1] === WORKBENCH_MCP_SERVER)
    return { server: codex[1], tool: codex[2], args: input }
  return null
}

// the integration a devbox tool call reached: exactly, for calls through the workbench MCP the index covers, and
// by the shape of the tool name, the CLI it ran or the host it fetched otherwise
export function toolIntegration(
  toolCall: DevboxToolCallFragment,
  index: McpToolIndex
): Nullable<ToolIntegration> {
  const mcp = mcpCall(toolCall)
  if (mcp) return mcpIntegration(mcp.server, mcp.tool, index)
  const input = inputOf(toolCall)
  const command = commandOf(toolCall, input)
  if (command) return commandIntegration(command)
  const url = str(input.url) ?? str(input.uri)
  return url ? hostIntegration(url) : null
}

// the integration behind a tool of the workbench MCP; other servers have none
export function mcpIntegration(
  server: string,
  tool: string,
  index: McpToolIndex
): Nullable<ToolIntegration> {
  if (server !== WORKBENCH_MCP_SERVER) return null
  const known = index.get(tool)
  if (known)
    return {
      type: known.toolType,
      provider: known.provider,
      workbenchToolId: known.workbenchToolId,
      workbenchToolName: known.workbenchToolName,
      action: mcpAction(tool, known.workbenchToolName),
    }
  const prefixed = MCP_TOOL_PREFIXES.find(([prefix]) => tool.startsWith(prefix))
  return prefixed
    ? { type: prefixed[1], action: humanize(tool.slice(prefixed[0].length)) }
    : null
}

export const McpToolIndexContext = createContext<McpToolIndex>(new Map())

// the instance's workbench MCP tools by name; console serves it, so it loads while the box is suspended too
export function useMcpToolIndex(instanceId: Nullable<string>): McpToolIndex {
  const { data } = useDevboxMcpToolsQuery({
    variables: { id: instanceId ?? '' },
    skip: !instanceId,
    fetchPolicy: 'cache-first',
  })
  const tools = data?.devboxInstance?.mcpTools
  return useMemo(() => mcpToolIndex(tools), [tools])
}

export function mcpToolIndex(
  tools: Nullable<Nullable<DevboxMcpToolFragment>[]>
): McpToolIndex {
  const index = new Map<string, DevboxMcpToolFragment>()
  for (const tool of tools ?? []) if (tool) index.set(tool.name, tool)
  return index
}

// the tool name without its type and workbench tool name, e.g. github_gh_close_pull_request -> close pull request
export function mcpAction(tool: string, workbenchToolName?: Nullable<string>) {
  const name = workbenchToolName?.replace(/[^a-zA-Z0-9_-]/g, '_')
  let rest = tool
  if (name) {
    const i = rest.indexOf(`_${name}_`)
    if (i >= 0) rest = rest.slice(i + name.length + 2)
    else if (rest.endsWith(`_${name}`)) rest = rest.slice(0, -(name.length + 1))
  }
  return humanize(rest.replace(/^workbench_observability_|^workbench_/, ''))
}

const humanize = (name: string) => name.replace(/_/g, ' ').trim()

// workbench MCP tools named for their integration, for tools the index no longer has (renamed or removed since)
const MCP_TOOL_PREFIXES: [string, WorkbenchToolType][] = [
  ['github_', WorkbenchToolType.Github],
  ['gitlab_', WorkbenchToolType.Gitlab],
  ['bitbucket_datacenter_', WorkbenchToolType.BitbucketDatacenter],
  ['bitbucket_', WorkbenchToolType.Bitbucket],
  ['azure_devops_', WorkbenchToolType.AzureDevops],
  ['jira_', WorkbenchToolType.Jira],
  ['service_now_', WorkbenchToolType.ServiceNow],
  ['slack_', WorkbenchToolType.Slack],
  ['teams_', WorkbenchToolType.Teams],
  ['pagerduty_', WorkbenchToolType.Pagerduty],
  ['sentry_', WorkbenchToolType.Sentry],
  ['docker_', WorkbenchToolType.Docker],
]

type Match = Omit<ToolIntegration, 'action'>

const cloud = (provider: Provider): Match => ({
  type: WorkbenchToolType.Cloud,
  provider,
})

// CLIs by the executable a command runs
const CLIS: Record<string, Match> = {
  gh: { type: WorkbenchToolType.Github },
  glab: { type: WorkbenchToolType.Gitlab },
  jira: { type: WorkbenchToolType.Jira },
  acli: { type: WorkbenchToolType.Jira },
  linear: { type: WorkbenchToolType.Linear },
  'sentry-cli': { type: WorkbenchToolType.Sentry },
  pd: { type: WorkbenchToolType.Pagerduty },
  docker: { type: WorkbenchToolType.Docker },
  'datadog-ci': { type: WorkbenchToolType.Datadog },
  dog: { type: WorkbenchToolType.Datadog },
  promtool: { type: WorkbenchToolType.Prometheus },
  logcli: { type: WorkbenchToolType.Loki },
  aws: cloud(Provider.Aws),
  gcloud: cloud(Provider.Gcp),
  gsutil: cloud(Provider.Gcp),
  bq: cloud(Provider.Gcp),
  az: cloud(Provider.Azure),
}

// az subcommands that drive Azure DevOps rather than Azure
const AZ_DEVOPS = new Set([
  'devops',
  'repos',
  'pipelines',
  'boards',
  'artifacts',
])

// API hosts, matched against the host and its parent domains
const HOSTS: Record<string, Match> = {
  'github.com': { type: WorkbenchToolType.Github },
  'githubusercontent.com': { type: WorkbenchToolType.Github },
  'gitlab.com': { type: WorkbenchToolType.Gitlab },
  'bitbucket.org': { type: WorkbenchToolType.Bitbucket },
  'dev.azure.com': { type: WorkbenchToolType.AzureDevops },
  'visualstudio.com': { type: WorkbenchToolType.AzureDevops },
  'atlassian.net': { type: WorkbenchToolType.Jira },
  'linear.app': { type: WorkbenchToolType.Linear },
  'slack.com': { type: WorkbenchToolType.Slack },
  'pagerduty.com': { type: WorkbenchToolType.Pagerduty },
  'sentry.io': { type: WorkbenchToolType.Sentry },
  'service-now.com': { type: WorkbenchToolType.ServiceNow },
  'datadoghq.com': { type: WorkbenchToolType.Datadog },
  'datadoghq.eu': { type: WorkbenchToolType.Datadog },
  'splunkcloud.com': { type: WorkbenchToolType.Splunk },
  'dynatrace.com': { type: WorkbenchToolType.Dynatrace },
  'live.dynatrace.com': { type: WorkbenchToolType.Dynatrace },
  'exa.ai': { type: WorkbenchToolType.Exa },
  'docker.io': { type: WorkbenchToolType.Docker },
  'docker.com': { type: WorkbenchToolType.Docker },
  'amazonaws.com': cloud(Provider.Aws),
  'googleapis.com': cloud(Provider.Gcp),
  'azure.com': cloud(Provider.Azure),
  'windows.net': cloud(Provider.Azure),
}

// wrappers that run the command after them
const WRAPPERS = new Set(['sudo', 'env', 'time', 'exec', 'command', 'nohup'])
const SHELLS = new Set(['bash', 'sh', 'zsh'])

// the integration of the first CLI or API URL in a command, looking through pipes, && and ; chains
export function commandIntegration(command: string): Nullable<Match> {
  for (const segment of command.split(/\|\||&&|[|;\n]/)) {
    const words = segment.trim().split(/\s+/).filter(Boolean)
    let i = 0
    while (
      i < words.length &&
      (WRAPPERS.has(words[i]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]))
    )
      i++
    const exe = words[i]?.split('/').pop()
    if (!exe) continue
    if (SHELLS.has(exe) && /^-\w*c$/.test(words[i + 1] ?? '')) {
      const inner = words
        .slice(i + 2)
        .join(' ')
        .replace(/^['"]|['"]$/g, '')
      const found = commandIntegration(inner)
      if (found) return found
      continue
    }
    if (exe === 'az' && AZ_DEVOPS.has(words[i + 1] ?? ''))
      return { type: WorkbenchToolType.AzureDevops }
    if (Object.hasOwn(CLIS, exe)) return CLIS[exe]
    if (exe === 'curl' || exe === 'wget' || exe === 'http' || exe === 'xh') {
      const url = words.slice(i + 1).find((w) => /^['"]?https?:\/\//.test(w))
      const found = url && hostIntegration(url.replace(/^['"]|['"]$/g, ''))
      if (found) return found
    }
  }
  return null
}

export function hostIntegration(url: string): Nullable<Match> {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  for (let h = host; h.includes('.'); h = h.slice(h.indexOf('.') + 1))
    if (Object.hasOwn(HOSTS, h)) return HOSTS[h]
  return null
}

function inputOf(toolCall: DevboxToolCallFragment): Input {
  const raw = toolCall.rawInput
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Input)
    : {}
}

function commandOf(toolCall: DevboxToolCallFragment, input: Input) {
  if (Array.isArray(input.command)) return input.command.join(' ')
  if (typeof input.command === 'string') return input.command
  return toolCall.kind === 'execute'
    ? (toolCall.title ?? '').replace(/^`|`$/g, '')
    : undefined
}
