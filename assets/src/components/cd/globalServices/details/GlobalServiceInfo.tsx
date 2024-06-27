import { useTheme } from 'styled-components'

export default function GlobalServiceInfo() {
  const theme = useTheme()

  //  useSetBreadcrumbs(useMemo(() => [], [globalService?.name]))

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.medium,
        alignItems: 'flex-start',
        height: '100%',
      }}
    >
      info
    </div>
  )
}
