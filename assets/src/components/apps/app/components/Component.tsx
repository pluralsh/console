import { Card, IconFrame, Tooltip } from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import { Flex, P } from 'honorable'
import { useNavigate, useParams } from 'react-router-dom'

import { ComponentIcon, ComponentStatus } from './misc'

export default function Component({
  component,
}: {
  component: any
}) {
  const navigate = useNavigate()
  const { appName } = useParams()
  const {
    name, group, kind, status,
  } = component

  const kindString = `${group || 'v1'}/${kind.toLowerCase()}`

  return (
    <Card
      display="flex"
      gap="small"
      paddingHorizontal="xsmall"
      paddingVertical="xxsmall"
      grow={1}
      cursor="pointer"
      _hover={{ backgroundColor: 'fill-one-hover' }}
      onClick={() => navigate(`/apps/${appName}/components/${kind.toLowerCase()}/${name}`)}
      overflow="hidden"
    >
      <IconFrame
        icon={<ComponentIcon kind={kind} />}
        size="medium"
        textValue={name}
        type="tertiary"
      />
      <Flex
        align="center"
        gap="small"
        flexShrink={1}
        overflow="hidden"
      >
        <Tooltip
          label={name}
          placement="bottom"
        >
          <P
            body2
            fontWeight={600}
            {...TRUNCATE}
            flexShrink={1}
          >
            {name}
          </P>
        </Tooltip>
        <Tooltip label={kindString}>
          <P
            caption
            color="text-xlight"
            {...TRUNCATE}
            flexShrink={0}
            marginRight="xsmall"
          >
            {kindString}
          </P>
        </Tooltip>
      </Flex>
      <Flex
        align="center"
        justify="end"
        grow={1}
        shrink={0}
      >
        <ComponentStatus status={status} />
      </Flex>
    </Card>
  )
}
