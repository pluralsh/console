import { IconFrame, IconFrameProps, Spinner } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function ChatInputIconFrame({
  active,
  disabled,
  icon,
  loading,
  ...props
}: { active?: boolean; loading?: boolean } & IconFrameProps) {
  const theme = useTheme()

  return (
    <IconFrame
      clickable
      disabled={disabled}
      icon={loading ? <Spinner /> : icon}
      size="xsmall"
      type="tertiary"
      css={{
        ...(active ? { color: theme.colors['icon-info'] } : {}),
        ...(disabled ? { color: theme.colors['icon-disabled'] } : {}),
      }}
      {...props}
    />
  )
}
