import {
  Card,
  CardProps,
  CaretRightIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { Flex, P } from 'honorable'

export const hasIcons = ({ spec: { descriptor } }) => descriptor?.icons?.length > 0

export const getIcon = (app, dark) => {
  const { spec: { descriptor } } = app

  if (!hasIcons(app)) return undefined

  if (dark && descriptor.icons.length > 1) return descriptor.icons[1]

  return descriptor.icons[0]
}

// TODO: Move it to design system.
export function ListItemBorder({ borderColor }: { borderColor: string }) {
  return (
    <Flex
      backgroundColor={borderColor}
      borderTopLeftRadius={4}
      borderBottomLeftRadius={4}
      height="100%"
      width="3px"
    />
  )
}

// TODO: Move it to design system.
export function ListItem({
  title, subtitle, description, icon, iconFrameType = 'floating', iconFrameSize = 'large', borderColor, chips, chipsPlacement = 'left', onClick, ...props
}: CardProps & {title: string, subtitle?: string, description?: string, icon?: any, iconFrameType?: any, iconFrameSize?: any, borderColor?: string, chips?: any, chipsPlacement?: 'left' | 'right', onClick: () => any},) {
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
      {borderColor && <ListItemBorder borderColor={borderColor} />}
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

