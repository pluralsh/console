import { Button, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

export const LiveIcon = styled.div<{ $live: boolean }>(({ theme, $live }) => ({
  backgroundColor: $live
    ? theme.colors['icon-success']
    : theme.colors['icon-neutral'],
  borderRadius: 10,
  height: 10,
  width: 10,
  transition: 'background-color 0.2s ease-in-out',
}))

export function LogsScrollIndicator({
  live,
  toggleLive,
}: {
  live: boolean
  toggleLive: () => void
}) {
  const theme = useTheme()
  return (
    <WrapWithIf
      condition={!live}
      wrapper={
        <Tooltip label="Note: enabling live logs will clear any specified end date/time filters" />
      }
    >
      <Button
        small
        floating
        startIcon={<LiveIcon $live={live} />}
        onClick={toggleLive}
        style={{
          color: live ? theme.colors.text : theme.colors['text-xlight'],
          transition: 'color 0.2s ease-in-out',
        }}
      >
        Live
      </Button>
    </WrapWithIf>
  )
}
