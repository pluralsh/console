import { useTheme } from 'styled-components'

export default function Configuration() {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      configmaps secrets
    </div>
  )
}
