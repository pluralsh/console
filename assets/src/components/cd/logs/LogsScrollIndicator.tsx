import { Button, Tooltip } from '@pluralsh/design-system'
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
  setLive,
}: {
  live: boolean
  setLive: (live: boolean) => void
}) {
  const theme = useTheme()
  return (
    <Tooltip
      label="Note: enabling live logs will ignore any specified end date/time filters"
      placement="top"
    >
      <Button
        small
        floating
        startIcon={<LiveIcon $live={live} />}
        onClick={() => setLive(!live)}
        style={{
          color: live ? theme.colors.text : theme.colors['text-xlight'],
          transition: 'color 0.2s ease-in-out',
        }}
      >
        Live
      </Button>
    </Tooltip>
  )
}
