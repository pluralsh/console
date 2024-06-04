import { useTheme } from 'styled-components'

export function ResponsiveLayoutSidecarContainer(props: any) {
  const theme = useTheme()

  return (
    <div
      css={{
        marginLeft: theme.spacing.xlarge,
        width: 200,
        flexShrink: 0,
      }}
      {...props}
    />
  )
}
