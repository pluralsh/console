import { useTheme } from 'styled-components'

export default function Storage() {
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
      pvc pv storageclasses
    </div>
  )
}
