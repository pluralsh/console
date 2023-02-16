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
  title, description, icon, borderColor, chips, onClick, ...props
}: CardProps & {title: string, description?: string, icon?: any, borderColor?: string, chips?: any, onClick?: () => any},) {
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
            size="large"
            textValue={title}
            type="floating"
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
            {chips}
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

