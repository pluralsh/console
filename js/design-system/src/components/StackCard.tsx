import { Div, type DivProps, Flex, P } from 'honorable'
import styled from 'styled-components'

import Card from './Card'
import AppIcon from './AppIcon'
import Tooltip from './Tooltip'
import Chip from './Chip'
import StackIcon from './icons/StackIcon'

type StackHue = 'neutral' | 'red' | 'green' | 'blue' | 'yellow'

type StackCardProps = DivProps & {
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
}

function StackCard({
  title,
  description,
  apps = [],
  hue = 'neutral',
  ...props
}: StackCardProps) {
  return (
    <Card
      clickable
      flexDirection="column"
      padding="large"
      width="100%"
      borderColor={hueToColor[hue]}
      fillLevel={1}
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
          {description && (
            <P
              body2
              fontWeight="300"
              color="text-light"
              marginTop="xsmall"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </P>
          )}
          <Div flexGrow={1} />
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

export default StackCard
