import { ChatTypeAttributes } from 'generated/graphql'
import { countBy, startCase, sumBy, truncate } from 'lodash'
import pluralize from 'pluralize'

export type ToolArguments =
  Record<string, unknown> | unknown[] | null | undefined

/** Canonical tool kinds used for labels, accordions, and batch group headers. */
export type ToolCallKind =
  | 'bash'
  | 'read'
  | 'grep'
  | 'edit'
  | 'command_execution'
  | 'python_sandbox'
  | 'mcp_tool_call'
  | 'file_change'
  | 'web_search'
  | 'subagent'
  | 'subagent_result'
  | 'enable_tools'
  | 'generic'

const CODEX_TOOL_NAMES = new Set([
  'command_execution',
  'dynamic_tool_call',
  'mcp_tool_call',
  'file_change',
  'web_search',
])

const CLAUDE_BATCH_TOOLS = new Set(['bash', 'read', 'grep', 'edit'])

const TITLE_OVERRIDES: Record<string, string> = {
  workbench_subagent: 'Subagent',
  workbench_subagents: 'Subagents',
  subagent_result: 'Result',
  enable_tools: 'Enable tools',
  python_sandbox: 'Python',
  workbench_lua: 'Lua',
  workbench_notes: 'Notes',
  workbench_plan: 'Plan',
  current_time: 'Time',
  agent_scratchpad: 'Scratchpad',
  saved_prompt: 'Prompt',
}

const STRIP_PREFIXES = [
  'workbench_observability_',
  'workbench_',
  'plrl_',
  'mcp_',
]

const ARG_PREVIEW_KEYS = [
  'path',
  'file',
  'filepath',
  'filename',
  'query',
  'pattern',
  'prompt',
  'command',
  'name',
  'resource',
  'namespace',
  'cluster',
  'url',
  'uri',
  'id',
  'output',
  'python',
  'lua',
  'code',
] as const

export function resolveToolCallKind(
  toolName: string,
  args?: ToolArguments
): ToolCallKind {
  const name = toolName.toLowerCase().trim()

  if (name === 'workbench_subagent') return 'subagent'
  if (name === 'subagent_result') return 'subagent_result'
  if (name === 'enable_tools') return 'enable_tools'
  if (
    name === 'command_execution' ||
    (!Array.isArray(args) && typeof args?.command === 'string')
  ) {
    return 'command_execution'
  }
  if (name === 'python_sandbox') return 'python_sandbox'
  if (name === 'file_change') return 'file_change'
  if (name === 'web_search') return 'web_search'
  if (name === 'mcp_tool_call' || isMcpToolName(toolName)) {
    return 'mcp_tool_call'
  }
  if (name.includes('bash')) return 'bash'
  if (name === 'edit' || name.includes('edit')) return 'edit'
  if (name.includes('read')) return 'read'
  if (name.includes('grep')) return 'grep'

  return 'generic'
}

/** Key used when batching consecutive tool calls in a group header. */
export function toolCallBatchKey(kind: ToolCallKind): string {
  switch (kind) {
    case 'command_execution':
      return 'command'
    case 'python_sandbox':
      return 'python'
    case 'mcp_tool_call':
      return 'mcp'
    case 'file_change':
      return 'files'
    case 'web_search':
      return 'search'
    case 'subagent':
      return 'subagent'
    case 'subagent_result':
      return 'result'
    case 'enable_tools':
      return 'enable'
    default:
      return kind
  }
}

const BATCH_LABELS: Record<string, string> = {
  bash: 'bash',
  read: 'read',
  grep: 'grep',
  edit: 'edit',
  command: 'command',
  python: 'python',
  mcp: 'mcp',
  files: 'file change',
  search: 'search',
  subagent: 'subagent',
  result: 'result',
  enable: 'enable tools',
  generic: 'tool call',
}

export const BATCHED_TOOL_KEYS = [
  'bash',
  'read',
  'grep',
  'edit',
  'command',
  'python',
  'mcp',
  'files',
  'search',
  'subagent',
  'result',
] as const

export function toolCallBatchLabel(kind: ToolCallKind, count: number): string {
  return toolCallBatchLabelFromKey(toolCallBatchKey(kind), count)
}

export function toolCallBatchLabelFromKey(key: string, count: number): string {
  const noun = BATCH_LABELS[key] ?? BATCH_LABELS.generic
  if (key === 'enable') return `${count} ${noun}`
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function toolCallGroupHeader(
  calls: Array<{ name?: string | null; arguments?: ToolArguments }>
): string {
  if (calls.length === 0) return ''

  const counts = countBy(calls, (call) =>
    toolCallBatchKey(resolveToolCallKind(call.name ?? '', call.arguments))
  )
  const batched = sumBy(BATCHED_TOOL_KEYS, (key) => counts[key] ?? 0)
  const other = calls.length - batched

  return [
    other > 0 && `${other} tool ${pluralize('call', other)}`,
    ...BATCHED_TOOL_KEYS.filter((key) => counts[key]).map((key) =>
      toolCallBatchLabelFromKey(key, counts[key] ?? 0)
    ),
  ]
    .filter(Boolean)
    .join(', ')
}

export function toolCallDisplayTitle(
  kind: ToolCallKind,
  toolName: string,
  args?: ToolArguments
): string {
  switch (kind) {
    case 'command_execution':
    case 'bash':
      return isShellCommand(getCommand(toolName, args)) ? 'Bash' : 'Command'
    case 'python_sandbox':
      return 'Python'
    case 'file_change':
    case 'edit':
      return 'Edit'
    case 'web_search':
      return 'Search'
    case 'mcp_tool_call':
      return 'MCP'
    case 'read':
      return 'Read'
    case 'grep':
      return 'Grep'
    case 'subagent':
      return 'Subagent'
    case 'subagent_result':
      return 'Result'
    case 'enable_tools':
      return 'Enable tools'
    default:
      return humanizeToolName(toolName)
  }
}

export function toolCallDisplaySubtitle(
  kind: ToolCallKind,
  toolName: string,
  args?: ToolArguments,
  content?: string | null
): string {
  const preview = (() => {
    switch (kind) {
      case 'command_execution':
      case 'bash':
        return getCommand(toolName, args)
      case 'python_sandbox':
        return getPython(args)
      case 'web_search':
        return getSearchQuery(args)
      case 'mcp_tool_call':
        return getMcpLabel(toolName, args)
      case 'file_change':
      case 'edit':
        return formatFileChangeSummary(args, content) || getPrimaryArgPreview(args)
      case 'read':
        return getPath(args) || getPrimaryArgPreview(args)
      case 'grep':
        return (
          [getPath(args), getSearchQuery(args) || getPattern(args)]
            .filter(Boolean)
            .join(' · ') || getPrimaryArgPreview(args)
        )
      case 'subagent':
        return formatSubagentSubtitle(args)
      case 'subagent_result':
        return getPrimaryArgPreview(args) || (content ?? '')
      case 'enable_tools':
        return getEnabledToolsPreview(args)
      default:
        return getPrimaryArgPreview(args)
    }
  })()

  return truncate(preview.replace(/\s+/g, ' ').trim(), { length: 72 })
}

export function humanizeToolName(toolName: string): string {
  const lower = toolName.toLowerCase().trim()
  if (!lower) return 'Tool'
  if (TITLE_OVERRIDES[lower]) return TITLE_OVERRIDES[lower]

  let rest = toolName.trim()
  for (const prefix of STRIP_PREFIXES) {
    if (lower.startsWith(prefix)) {
      rest = rest.slice(prefix.length)
      break
    }
  }

  const humanized = startCase(rest.replace(/[_-]+/g, ' ').trim())
  return humanized || 'Tool'
}

export function getSubagentRole(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  return typeof args.subagent === 'string' ? args.subagent : ''
}

export function getSubagentPrompt(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  return typeof args.prompt === 'string' ? args.prompt : ''
}

function formatSubagentSubtitle(args?: ToolArguments): string {
  const role = startCase(getSubagentRole(args).replace(/[_-]+/g, ' '))
  const prompt = getSubagentPrompt(args)
  return [role, prompt].filter(Boolean).join(' · ')
}

export function getCommand(toolName: string, args?: ToolArguments): string {
  if (args && !Array.isArray(args) && typeof args.command === 'string') {
    return args.command
  }
  if (resolveToolCallKind(toolName, args) === 'command_execution') {
    return toolName
  }
  return ''
}

export function getSearchQuery(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  return typeof args.query === 'string' ? args.query : ''
}

export function getPython(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  return typeof args.python === 'string' ? args.python : ''
}

export function getPath(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  for (const key of ['path', 'file', 'filepath', 'filename'] as const) {
    const value = args[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function getPattern(args?: ToolArguments): string {
  if (!args || Array.isArray(args)) return ''
  return typeof args.pattern === 'string' ? args.pattern : ''
}

export function getMcpLabel(toolName: string, args?: ToolArguments): string {
  if (!args || Array.isArray(args)) {
    return isMcpToolName(toolName) ? toolName : toolName
  }
  const server = typeof args.server === 'string' ? args.server : undefined
  const tool = typeof args.tool === 'string' ? args.tool : undefined
  if (server && tool) return `${server}/${tool}`
  if (isMcpToolName(toolName)) return toolName
  return toolName
}

export function getPrimaryArgPreview(args?: ToolArguments): string {
  if (Array.isArray(args)) {
    return args.length ? `${args.length} items` : ''
  }
  if (!args) return ''

  const toolsPreview = getEnabledToolsPreview(args)
  if (toolsPreview) return toolsPreview

  for (const key of ARG_PREVIEW_KEYS) {
    const value = args[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function getEnabledToolsPreview(args?: ToolArguments): string {
  if (!args || Array.isArray(args) || !Array.isArray(args.tools)) return ''
  return args.tools
    .filter((tool): tool is string => typeof tool === 'string' && !!tool.trim())
    .join(', ')
}

export function formatFileChangeSummary(
  args?: ToolArguments,
  content?: string | null
): string {
  if (Array.isArray(args)) {
    const paths = args
      .map((c) =>
        c && typeof c === 'object' && 'path' in c
          ? `${(c as { kind?: string }).kind ?? 'update'}:${(c as { path: string }).path}`
          : ''
      )
      .filter(Boolean)
    if (paths.length) return paths.join(', ')
  }
  if (content) return content
  return ''
}

export function isShellCommand(command: string): boolean {
  return /^(bash|sh|zsh)\b/.test(command.trim())
}

function isMcpToolName(toolName: string): boolean {
  return (
    toolName.includes('/') &&
    !CODEX_TOOL_NAMES.has(toolName.toLowerCase()) &&
    !CLAUDE_BATCH_TOOLS.has(toolName.toLowerCase())
  )
}

export function toolCallModalHeader(
  kind: ToolCallKind,
  toolName: string,
  args?: ToolArguments
): string {
  const title = toolCallDisplayTitle(kind, toolName, args)
  const subtitle = toolCallDisplaySubtitle(kind, toolName, args)
  return subtitle ? `${title}: ${subtitle}` : `${title}: ${toolName}`
}

export function styledToolCallKinds(): ToolCallKind[] {
  return [
    'bash',
    'command_execution',
    'python_sandbox',
    'read',
    'grep',
    'edit',
    'file_change',
    'web_search',
    'mcp_tool_call',
    'subagent',
    'subagent_result',
    'enable_tools',
    'generic',
  ]
}

export function isStyledToolCall(
  toolName: string,
  attributes?: Nullable<ChatTypeAttributes>
): boolean {
  const kind = resolveToolCallKind(toolName, attributes?.tool?.arguments)
  return styledToolCallKinds().includes(kind)
}
