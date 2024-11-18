import { ReactElement, ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { Card, InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'

export function HomeCard({
  icon,
  title,
  tooltip,
  children,
}: {
  icon?: ReactElement
  title: string
  tooltip?: ReactNode
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        border: theme.borders['fill-two'],
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        css={{
          alignItems: 'center',
          borderBottom: theme.borders['fill-two'],
          borderTopLeftRadius: theme.borderRadiuses.large,
          borderTopRightRadius: theme.borderRadiuses.large,
          backgroundColor: theme.colors['fill-two'],
          display: 'flex',
          gap: theme.spacing.medium,
          height: 48,
          padding: theme.spacing.medium,
        }}
      >
        <div css={{ color: theme.colors['text-light'] }}>{icon}</div>
        <div
          css={{
            ...theme.partials.text.overline,
            color: theme.colors['text-xlight'],
            flexGrow: 1,
          }}
        >
          {title}
        </div>
        {tooltip && (
          <Tooltip label={tooltip}>
            <div css={{ color: theme.colors['text-light'] }}>
              <InfoOutlineIcon />
            </div>
          </Tooltip>
        )}
      </div>
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: theme.spacing.large,
        }}
      >
        {children}
      </div>
    </Card>
  )
}
