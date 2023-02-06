import { ProgressBar } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

function UsageBarUnstyled({ usage, ...props }: { usage: number; }) {
  const theme = useTheme()
  const color = usage > 0.9
    ? theme.colors['icon-danger']
    : usage > 0.75
      ? theme.colors['border-warning']
      : theme.colors['icon-success']

  return (
    <ProgressBar
      height={3}
      mode="determinate"
      progress={usage}
      progressColor={color}
      completeColor={color}
      {...props}
    />
  )
}

export const UsageBar = styled<any>(UsageBarUnstyled)(({ theme }) => ({
  marginTop: theme.spacing.xxsmall,
}))
