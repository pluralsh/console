import { Card, CaretRightIcon, IconFrame } from '@pluralsh/design-system'
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
  title, description, icon, borderColor, onClick,
}: {title: string, description: string, icon: any, borderColor?: string, onClick: () => any},) {
  return (
    <Card
      clickable
      display="flex"
      flexGrow={1}
      flexShrink={1}
      marginBottom="small"
      minWidth={240}
      onClick={onClick}
    >
      {borderColor && <ListItemBorder borderColor={borderColor} />}
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        padding="medium"
      >
        {/* TODO: Update once design system will be fixed. */}
        <IconFrame
          icon={icon}
          textValue={title}
        />
        <Flex direction="column">
          <Flex gap="small">
            <P
              body1
              fontWeight={600}
            >
              {title}
            </P>
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
        <CaretRightIcon />
      </Flex>
    </Card>
  )
}

