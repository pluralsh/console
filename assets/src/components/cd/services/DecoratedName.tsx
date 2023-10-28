import { Chip } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export default function DecoratedName({
  prefix,
  deletedAt,
  children,
}: {
  prefix?: any
  deletedAt?: any
  children: any
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
      }}
    >
      {prefix}
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
