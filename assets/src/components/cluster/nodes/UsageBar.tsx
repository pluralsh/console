import { ProgressBar } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

function UsageBarUnstyled({ usage, ...props }: { usage: number; }) {
  const theme = useTheme()
  const color = usage > 0.9
    ? theme.colors['border-danger']
    : usage > 0.75
      ? theme.colors['border-warning']
      : theme.colors['border-success']

  return (
    <ProgressBar
      height={4}
      mode="determinate"
      progress={usage}
      progressColor={color}
      completeColor={color}
      {...props}
    />
  )
}

export const UsageBar = styled(UsageBarUnstyled)(({ theme }) => ({
  marginTop: theme.spacing.xxsmall,
}))
