import { useTheme } from 'styled-components'

export function ChatInputSelectButton({
  tooltip,
  children,
}: {
  tooltip?: string
  children: React.ReactNode
}) {
  const theme = useTheme()

  console.log(tooltip) // TODO: Implement tooltip handling.

  // TODO: Fix panel rendering.

  return (
    <button
      css={{
        ...theme.partials.reset.button,
        alignItems: 'center',
        borderRadius: theme.borderRadiuses.medium,
        display: 'flex',
        fontSize: 12,
        gap: theme.spacing.xxsmall,
        height: 16,
        padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,

        '&:hover': {
          backgroundColor: theme.colors['fill-three-hover'],
        },

        '&:focus': {
          backgroundColor: theme.colors['fill-three-selected'],
        },
      }}
    >
      {children}
    </button>
  )
}
