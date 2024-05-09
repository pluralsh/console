import { useNavigate } from 'react-router-dom'
import { Flex, P } from 'honorable'
import {
  AppIcon,
  CaretRightIcon,
  Chip,
  InstallIcon,
} from '@pluralsh/design-system'

import moment from 'moment'

import { StackRunFragment } from '../../generated/graphql'

export default function StackRun({ stackRun }: { stackRun: StackRunFragment }) {
  const {
    id,
    insertedAt,
    message,
    status,
    approvedAt,
    approver,
    git: { ref },
  } = stackRun
  const navigate = useNavigate()

  return (
    <Flex
      borderBottom="1px solid border"
      gap="small"
      padding="medium"
      cursor="pointer"
      _hover={{ backgroundColor: 'fill-one-hover' }}
      onClick={() => navigate(`/builds/${id}`)}
      width="100%"
    >
      <AppIcon
        icon={<InstallIcon />}
        size="xsmall"
      />
      <Flex direction="column">
        <Flex gap="small">
          <P
            body1
            fontWeight={600}
          >
            {message}
          </P>
        </Flex>
        ref: {ref}
      </Flex>
      <Flex
        caption
        color="text-xlight"
        gap="medium"
        grow={1}
        align="center"
        justify="end"
      >
        <div>{moment(insertedAt).fromNow()}</div>
        <Chip>{status}</Chip>
        <CaretRightIcon />
      </Flex>
    </Flex>
  )
}
