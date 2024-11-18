import { ReactElement, ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { Card, InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'

export const HOME_CARD_MAX_HEIGHT = '330px'

export function HomeCard({
  icon,
  title,
  tooltip,
  noPadding = false,
  children,
}: {
  icon?: ReactElement
  title: string
  tooltip?: ReactNode
  noPadding?: boolean
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        border: theme.borders['fill-two'],
        display: 'flex',
        flexDirection: 'column',
        maxHeight: HOME_CARD_MAX_HEIGHT,
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
          display: 'flex',
          flexDirection: 'column',
          padding: noPadding ? undefined : theme.spacing.large,
        }}
      >
        {children}
      </div>
    </Card>
  )
}
