import { IconFrame, Tooltip } from '@pluralsh/design-system'
import { ListItemBorder } from 'components/apps/misc'
import { TRUNCATE } from 'components/utils/truncate'
import { Flex, P } from 'honorable'
import { useNavigate, useParams } from 'react-router-dom'

import { ComponentIcon, ComponentStatus, statusToBorder } from './misc'

export default function Component({ component, last }: {component: any, last: boolean}) {
  const navigate = useNavigate()
  const { appName } = useParams()
  const {
    name, group, kind, status,
  } = component

  return (
    <Flex
      cursor="pointer"
      _hover={{ backgroundColor: 'fill-one-hover' }}
      borderBottom={!last && '1px solid border'}
      grow={1}
      minWidth={240}
      onClick={() => navigate(`/apps/${appName}/components/${kind.toLowerCase()}/${name}`)}
    >
      <ListItemBorder borderColor={statusToBorder[status]} />
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        paddingHorizontal="small"
        paddingVertical="xsmall"
      >
        <IconFrame
          icon={<ComponentIcon kind={kind} />}
          size="medium"
          textValue={name}
          type="tertiary"
        />
        <Flex
          gap="small"
          align="center"
          grow={1}
          {...TRUNCATE}
        >
          <Tooltip
            label={name}
            placement="bottom"
          >
            <P
              body1
              fontWeight={600}
              {...TRUNCATE}
            >
              {name}
            </P>
          </Tooltip>
          <P
            caption
            color="text-xlight"
          >
            {group || 'v1'}/{kind.toLowerCase()}
          </P>
        </Flex>
      </Flex>
      <Flex
        align="center"
        justify="end"
        grow={1}
        marginRight="small"
      >
        <ComponentStatus status={status} />
      </Flex>
    </Flex>
  )
}

