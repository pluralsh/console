import { Flex, P } from 'honorable'
import {
  Card,
  CaretRightIcon,
  DashboardIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

export default function DashboardCard({ name, description }: {name: string, description: string}) {
  const navigate = useNavigate()

  return (
    <Card
      clickable
      display="flex"
      flexGrow={1}
      flexShrink={1}
      marginVertical="xsmall"
      minWidth={240}
      onClick={() => {
        navigate('/') // TODO: Update.
      }}
    >
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        padding="medium"
      >
        {/* TODO: Update once design system will be fixed. */}
        <IconFrame
          icon={<DashboardIcon />}
          textValue={name}
        />
        <Flex direction="column">
          <Flex gap="small">
            <P
              body1
              fontWeight={600}
            >
              {name}
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
