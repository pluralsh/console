import { AppIcon } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { Flex, Span } from 'honorable'

import { User } from '../../../generated/graphql'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnUser = ColumnBuilder.accessor(row => row.user, {
  id: 'user',
  header: 'User',
  enableGlobalFilter: false,
  enableSorting: false,
  cell,
})

function cell(props: CellContext<VPNClientRow, User | undefined>): JSX.Element {
  const user = props.getValue()

  return (
    <Flex gap="xsmall">
      <AppIcon
        name={user?.name}
        url={user?.profile ?? undefined}
        size="xxsmall"
      />
      <Flex direction="column">
        <Span
          body2
          color="text-light"
          lineHeight="18px"
        >{user?.name}
        </Span>
        <Span
          caption
          color="text-xlight"
          lineHeight="14px"
        >{user?.email}
        </Span>
      </Flex>
    </Flex>
  )
}

export { ColumnUser }
