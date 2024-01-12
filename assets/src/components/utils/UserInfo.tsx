import { AppIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export default function UserInfo({
  user: { email, name, avatar },
  className,
}: {
  user: { email: string; name: string; avatar: string }
  className?: string
}) {
  const theme = useTheme()

  return (
    <div
      className={className}
      css={{
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
      }}
    >
      <AppIcon
        url={avatar}
        name={name}
        spacing={avatar ? 'none' : undefined}
        size="xsmall"
      />
      <div css={{ display: 'flex', flexDirection: 'column' }}>
        <span css={{ fontWeight: 'bold' }}>{name}</span>
        <span css={{ color: theme.colors['text-light'] }}>{email}</span>
      </div>
    </div>
  )
}
