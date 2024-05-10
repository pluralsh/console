import { Flex, P } from 'honorable'
import {
  CaretRightIcon,
  Chip,
  CliIcon,
  IconFrame,
  PlayIcon,
} from '@pluralsh/design-system'
import moment from 'moment'
import { useTheme } from 'styled-components'

import { StackRunFragment } from '../../generated/graphql'

export default function StackRun({
  stackRun,
  first,
}: {
  stackRun: StackRunFragment
  first: boolean
}) {
  const {
    insertedAt,
    message,
    status,
    approval,
    approvedAt,
    approver,
    git: { ref },
  } = stackRun
  const theme = useTheme()

  return (
    <div
      css={{
        alignItems: 'center',
        borderBottom: theme.borders.default,
        cursor: 'pointer',
        display: 'flex',
        gap: theme.spacing.small,
        padding: theme.spacing.medium,
        '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
      }}
    >
      <IconFrame icon={<CliIcon />} />
      <Flex direction="column">
        <Flex gap="small">
          <P
            body1
            fontWeight={600}
          >
            {message ?? (first ? 'Initial run' : 'No message')}
          </P>
        </Flex>
        {approval && (
          <Chip
            size="small"
            severity="warning"
          >
            {approvedAt ? moment(approvedAt).fromNow() : 'Pending approval'}
          </Chip>
        )}
        <div
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-xlight'],
          }}
        >
          {ref}
        </div>
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
    </div>
  )
}
