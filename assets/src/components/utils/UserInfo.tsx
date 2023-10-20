import { AppIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps } from 'react'

export default function UserInfo({
  user: { email, name, avatar },
  hue = 'lighter',
  className,
}: {
  user: { email: string; name: string; avatar: string }
  hue?: ComponentProps<typeof AppIcon>['hue']
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
        hue={hue}
      />
      <div css={{ display: 'flex', flexDirection: 'column' }}>
        <span css={{ fontWeight: 'bold' }}>{name}</span>
        <span css={{ color: theme.colors['text-light'] }}>{email}</span>
      </div>
    </div>
  )
}
