import { Flex } from 'honorable'
import styled, { useTheme } from 'styled-components'

import Card, { type CardProps } from './Card'
import AppIcon from './AppIcon'
import Tooltip from './Tooltip'
import Chip from './Chip'
import StackIcon from './icons/StackIcon'
import { type SemanticColorKey } from '../theme/colors'

type StackHue = 'neutral' | 'red' | 'green' | 'blue' | 'yellow'

type StackCardProps = CardProps & {
  title?: string
  description?: string
  apps?: App[]
  hue?: StackHue
}

type App = {
  name?: string
  imageUrl?: string
}

const hueToColor = {
  neutral: 'border',
  red: 'text-danger-light',
  green: 'text-success-light',
  blue: 'border-outline-focused',
  yellow: 'text-warning-light',
} as const satisfies Record<StackHue, SemanticColorKey>

function StackCard({
  title,
  description,
  apps = [],
  hue = 'neutral',
  ...props
}: StackCardProps) {
  const theme = useTheme()

  return (
    <Card
      clickable
      fillLevel={1}
      width="100%"
      css={{
        padding: theme.spacing.large,
        borderColor: theme.colors[hueToColor[hue]],
      }}
      {...props}
    >
      <Flex
        height="100%"
        align="flex-start"
      >
        <Flex
          flexGrow={1}
          direction="column"
          height="100%"
        >
          <Flex align="center">
            <Flex
              direction="row"
              width="100%"
              align="flex-start"
              justify="space-between"
            >
              <Flex direction="column">
                <TitleSC>{title}</TitleSC>
                <AppCountSC>
                  {apps?.length || 0} APP{apps?.length !== 1 && 'S'}
                </AppCountSC>
              </Flex>
              <Chip icon={<StackIcon />}>Stack</Chip>
            </Flex>
          </Flex>
          {description && <DescriptionSC>{description}</DescriptionSC>}
          <div css={{ flexGrow: 1 }} />
          {apps?.length > 0 && (
            <Flex
              marginTop="medium"
              gap="xsmall"
              flexWrap="wrap"
            >
              {apps.map((app, i) => (
                <Tooltip
                  key={i}
                  label={app.name}
                  placement="bottom"
                >
                  <AppIcon
                    alt={app.name}
                    url={app.imageUrl}
                    size="xxsmall"
                    hue="lighter"
                  />
                </Tooltip>
              ))}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

const TitleSC = styled.h1(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing.xxsmall,
  ...theme.partials.text.subtitle1,
  color: theme.colors.text,
}))

const AppCountSC = styled.h3(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing.xxsmall,
  ...theme.partials.text.body2,
  fontWeight: 300,
  color: theme.colors['text-xlight'],
}))

const DescriptionSC = styled.p(({ theme }) => ({
  margin: 0,
  marginTop: theme.spacing.xsmall,
  ...theme.partials.text.body2,
  fontWeight: 300,
  color: theme.colors['text-light'],
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}))

export default StackCard
