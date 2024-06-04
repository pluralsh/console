import { useTheme } from 'styled-components'

export function ResponsiveLayoutSidenavContainer(props: any) {
  const theme = useTheme()

  return (
    <div
      css={{
        marginRight: theme.spacing.xlarge,
        minWidth: 0,
        minHeight: 0,
        flexShrink: 0,
        width: 240,
      }}
      {...props}
    />
  )
}
