import { ReactElement, ReactNode } from 'react'
import { useTheme } from 'styled-components'
import {
  ArrowTopRightIcon,
  Card,
  IconFrame,
  InfoOutlineIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

export const HOME_CARD_MAX_HEIGHT = 330
const HOME_CARD_HEADER_HEIGHT = 48
export const HOME_CARD_CONTENT_HEIGHT =
  HOME_CARD_MAX_HEIGHT - HOME_CARD_HEADER_HEIGHT

export function HomeCard({
  icon,
  title,
  tooltip,
  link,
  noPadding = false,
  children,
}: {
  icon?: ReactElement<any>
  title: string
  tooltip?: ReactNode
  link?: string
  noPadding?: boolean
  children: ReactNode
}) {
  const theme = useTheme()
  const navigate = useNavigate()

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
          gap: theme.spacing.small,
          height: HOME_CARD_HEADER_HEIGHT,
          padding: theme.spacing.medium,
          overflow: 'hidden',
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
        {link && (
          <IconFrame
            clickable
            onClick={() => navigate(link)}
            icon={<ArrowTopRightIcon />}
          />
        )}
      </div>
      <div
        css={{
          maxHeight: HOME_CARD_CONTENT_HEIGHT,
          padding: noPadding ? undefined : theme.spacing.large,
          width: '100%',
        }}
      >
        {children}
      </div>
    </Card>
  )
}
