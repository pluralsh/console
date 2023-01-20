import {
  Card,
  CardProps,
  CaretRightIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { Flex, P } from 'honorable'
import { Readiness } from 'utils/status'

export const hasIcons = ({ spec: { descriptor } }) => descriptor?.icons?.length > 0

export const getIcon = (app, dark = true) => {
  const { spec: { descriptor } } = app

  if (!hasIcons(app)) return undefined

  if (dark && descriptor.icons.length > 1) return descriptor.icons[1]

  return descriptor.icons[0]
}

export function appState({ status: { conditions } }) {
  const ready = conditions.find(({ type }) => type === 'Ready')
  const error = conditions.find(({ type }) => type === 'Error')
  const readiness = error.status === 'True' ? Readiness.Failed : (ready.status === 'True' ? Readiness.Ready : Readiness.InProgress)

  return { ready, error, readiness }
}

export function ListItemBorder({ color, width = 3, radius = 4 }: { color: string, width?: number, radius?: number }) {
  return (
    <Flex
      backgroundColor={color}
      borderTopLeftRadius={radius}
      borderBottomLeftRadius={radius}
      height="inherit"
      width={width}
    />
  )
}

export function ListItem({
  title, subtitle, description, icon, iconFrameType = 'floating', iconFrameSize = 'large', borderColor, chips, chipsPlacement = 'left', onClick, ...props
}: CardProps & {title: string, subtitle?: string, description?: string, icon?: any, iconFrameType?: any, iconFrameSize?: any, borderColor?: string, chips?: any, chipsPlacement?: 'left' | 'right', onClick?: () => any},) {
  return (
    <Card
      clickable
      display="flex"
      flexGrow={1}
      marginBottom="small"
      minWidth={240}
      onClick={onClick}
      {...props}
    >
      {borderColor && <ListItemBorder color={borderColor} />}
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        padding="medium"
      >
        {icon && (
          <IconFrame
            icon={icon}
            size={iconFrameSize}
            textValue={title}
            type={iconFrameType}
          />
        )}
        <Flex direction="column">
          <Flex
            gap="small"
            align="center"
            grow={1}
          >
            <P
              body1
              fontWeight={600}
            >
              {title}
            </P>
            {subtitle && (
              <P
                caption
                color="text-xlight"
              >
                {subtitle}
              </P>
            )}
            {chipsPlacement === 'left' && chips}
          </Flex>
          {description && <Flex>{description}</Flex>}
        </Flex>
      </Flex>
      <Flex grow={1} />
      <Flex
        align="center"
        gap="16px"
        padding="medium"
      >
        {chipsPlacement === 'right' && chips}
        <CaretRightIcon />
      </Flex>
    </Card>
  )
}

