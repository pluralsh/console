import { Chip } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export default function DecoratedName({ deletedAt, children }) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
      }}
    >
      {children}
      {deletedAt && (
        <Chip
          loading
          severity="neutral"
        >
          Deleting
        </Chip>
      )}
    </div>
  )
}
