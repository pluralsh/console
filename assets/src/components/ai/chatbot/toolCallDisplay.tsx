import { ChatTypeAttributes } from 'generated/graphql'
import { truncate } from 'lodash'

export type ToolArguments =
  | Record<string, unknown>
  | unknown[]
  | null
  | undefined

/** Canonical tool kinds used for labels, accordions, and batch group headers. */
export type ToolCallKind =
  | 'bash'
  | 'read'
  | 'grep'
  | 'edit'
  | 'command_execution'
  | 'mcp_tool_call'
  | 'file_change'
  | 'web_search'
  | 'generic'

const CODEX_TOOL_NAMES = new Set([
  'command_execution',
  'dynamic_tool_call',
  'mcp_tool_call',
  'file_change',
  'web_search',
])

const CLAUDE_BATCH_TOOLS = new Set(['bash', 'read', 'grep', 'edit'])

export function resolveToolCallKind(
  toolName: string,
  args?: ToolArguments
): ToolCallKind {
  const name = toolName.toLowerCase().trim()

  if (
    name === 'command_execution' ||
    (!Array.isArray(args) && typeof args?.command === 'string')
  ) {
    return 'command_execution'
  }
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
    case 'mcp_tool_call':
      return 'mcp'
    case 'file_change':
      return 'files'
    case 'web_search':
      return 'search'
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
  mcp: 'mcp',
  files: 'file change',
  search: 'search',
  generic: 'tool call',
}

export function toolCallBatchLabel(kind: ToolCallKind, count: number): string {
  return toolCallBatchLabelFromKey(toolCallBatchKey(kind), count)
}

export function toolCallBatchLabelFromKey(key: string, count: number): string {
  const noun = BATCH_LABELS[key] ?? BATCH_LABELS.generic
  return `${count} ${noun}${count === 1 ? '' : 's'}`
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
    case 'file_change':
    case 'edit':
      return 'Files'
    case 'web_search':
      return 'Search'
    case 'mcp_tool_call':
      return 'MCP'
    case 'read':
      return 'Read'
    case 'grep':
      return 'Grep'
    default:
      return 'Tool'
  }
}

export function toolCallDisplaySubtitle(
  kind: ToolCallKind,
  toolName: string,
  args?: ToolArguments,
  content?: string | null
): string {
  switch (kind) {
    case 'command_execution':
    case 'bash':
      return truncate(getCommand(toolName, args), { length: 48 })
    case 'web_search':
      return truncate(getSearchQuery(args), { length: 48 })
    case 'mcp_tool_call':
      return truncate(getMcpLabel(toolName, args), { length: 48 })
    case 'file_change':
    case 'edit':
      return truncate(formatFileChangeSummary(args, content), { length: 48 })
    default:
      return truncate(toolName, { length: 48 })
  }
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
    'read',
    'grep',
    'edit',
    'file_change',
    'web_search',
    'mcp_tool_call',
  ]
}

export function isStyledToolCall(
  toolName: string,
  attributes?: Nullable<ChatTypeAttributes>
): boolean {
  const kind = resolveToolCallKind(toolName, attributes?.tool?.arguments)
  return styledToolCallKinds().includes(kind)
}
