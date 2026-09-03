import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

export function TabLabelWithIndicatorDot({
  children,
  showDot,
}: {
  children: ReactNode
  showDot?: boolean
}) {
  const theme = useTheme()

  return (
    <span
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing.xsmall,
      }}
    >
      {children}
      {showDot && (
        <span
          css={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: theme.colors.yellow[300],
            flexShrink: 0,
          }}
        />
      )}
    </span>
  )
}
