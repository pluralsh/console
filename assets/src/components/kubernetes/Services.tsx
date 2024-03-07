import { useTheme } from 'styled-components'

export default function Services() {
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
      services
    </div>
  )
}
