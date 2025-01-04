import { Div, type DivProps, Flex, H1, H3, P } from 'honorable'

import Card from './Card'
import AppIcon from './AppIcon'
import Tooltip from './Tooltip'
import Chip from './Chip'
import StackIcon from './icons/StackIcon'

const HUES = ['neutral', 'red', 'green', 'blue', 'yellow'] as const

type StackCardProps = DivProps & {
  title?: string
  description?: string
  apps?: App[]
  hue?: (typeof HUES)[number]
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
                <H1
                  subtitle1
                  color="text"
                  marginBottom="xxsmall"
                >
                  {title}
                </H1>
                <H3
                  body2
                  fontWeight="300"
                  color="text-xlight"
                  marginBottom="xxsmall"
                >
                  {apps?.length || 0} APP{apps?.length !== 1 && 'S'}
                </H3>
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

export default StackCard
