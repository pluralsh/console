import { Switch } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function LogsScrollIndicator({
  live,
  setLive,
}: {
  live: boolean
  setLive: (live: boolean) => void
}) {
  const { colors } = useTheme()
  return (
    <Switch
      checked={live}
      onChange={() => setLive(!live)}
      variant="green"
      css={{ color: colors.text }}
    >
      Live logs {live ? 'enabled' : 'disabled'}
    </Switch>
  )
}
