import {
  IconProps,
  McpLogoIcon,
  PythonLogoIcon,
  TerminalIcon,
  ToolIcon,
} from '@pluralsh/design-system'
import { isCmdToolKind, ToolCallKind } from './toolCallDisplay'

/** Icon next to a tool name when it is not a configured workbench tool. */
export function ToolCallKindIcon({
  kind,
  size = 12,
  ...props
}: { kind: ToolCallKind } & IconProps) {
  if (kind === 'python_sandbox') {
    return (
      <PythonLogoIcon
        fullColor
        size={size}
        css={{ flexShrink: 0 }}
        {...props}
      />
    )
  }

  const Icon = isCmdToolKind(kind)
    ? TerminalIcon
    : kind === 'mcp_tool_call'
      ? McpLogoIcon
      : ToolIcon

  return (
    <Icon
      color="icon-xlight"
      size={size}
      style={{ flexShrink: 0 }}
      {...props}
    />
  )
}
