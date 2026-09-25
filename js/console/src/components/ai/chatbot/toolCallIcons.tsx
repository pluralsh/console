import { IconProps, PythonLogoIcon, ToolIcon } from '@pluralsh/design-system'
import { ToolCallKind } from './toolCallDisplay'

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

  return (
    <ToolIcon
      color="icon-xlight"
      size={size}
      css={{ flexShrink: 0 }}
      {...props}
    />
  )
}
