import { Chip } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

export default function DecoratedName({
  prefix,
  suffix,
  deletedAt,
  children,
}: {
  prefix?: ReactNode
  suffix?: ReactNode
  deletedAt?: any
  children: ReactNode
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
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.xsmall,
          alignItems: 'center',
        }}
      >
        {prefix}
        {children}
        {suffix}
      </div>
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
