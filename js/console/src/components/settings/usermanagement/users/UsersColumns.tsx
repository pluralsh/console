import { createColumnHelper, Row } from '@tanstack/react-table'
import { Body2P } from 'components/utils/typography/Text'
import UserInfo from 'components/utils/UserInfo'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColMembershipExpander,
  MembershipExpandPanel,
  MembershipListRowSC,
} from '../MembershipExpandPanel'
import { formatUserGroupsCopy } from '../membershipCopy'
import { UserAdminCell, UsersTableUser } from './User'

const columnHelper = createColumnHelper<UsersTableUser>()

const ColUser = columnHelper.accessor((user) => user, {
  id: 'user',
  header: 'Users',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const user = getValue()

    return (
      <UserInfo
        user={{
          name: user.name,
          email: user.email,
          avatar: user.profile ?? undefined,
        }}
      />
    )
  },
})

const ColGroups = columnHelper.accessor(
  (user) => user.groups?.filter(isNonNullable).length ?? 0,
  {
    id: 'groups',
    header: 'Groups',
    meta: { gridTemplate: '80px' },
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }
)

const ColAdmin = columnHelper.accessor((user) => user, {
  id: 'admin',
  header: 'Admin',
  meta: { gridTemplate: '130px' },
  cell: function Cell({ getValue }) {
    return <UserAdminCell user={getValue()} />
  },
})

export function UserGroupsExpand({ row }: { row: Row<UsersTableUser> }) {
  const user = row.original
  const groups = user.groups?.filter(isNonNullable) ?? []

  return (
    <MembershipExpandPanel
      copyText={formatUserGroupsCopy(user, groups)}
      emptyMessage="This user is not in any groups."
    >
      {groups.map((group) => (
        <MembershipListRowSC key={group.id}>
          <Body2P $color="text-light">{group.name}</Body2P>
        </MembershipListRowSC>
      ))}
    </MembershipExpandPanel>
  )
}

export const usersCols = [ColMembershipExpander, ColUser, ColGroups, ColAdmin]
