import { AppIcon, Modal } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import { UserWithGroupsFragment } from 'generated/graphql'
import { useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColMembershipExpander,
  MembershipExpandPanel,
  MembershipListRowSC,
  MembershipListSC,
  MEMBERSHIP_VISIBLE_ROWS,
} from '../MembershipExpandPanel'
import { formatUserGroupsCopy } from '../membershipCopy'
import { UserAdminCell } from './User'

const columnHelper = createColumnHelper<UserWithGroupsFragment>()

const ColUser = columnHelper.accessor((user) => user, {
  id: 'user',
  header: 'Users',
  meta: { gridTemplate: 'minmax(0, 1fr)' },
  cell: function Cell({ getValue }) {
    const user = getValue()

    return (
      <StackedText
        icon={
          <AppIcon
            css={{ flexShrink: 0 }}
            url={user.profile ?? undefined}
            name={user.name}
            spacing={user.profile ? 'none' : undefined}
            size="xxsmall"
          />
        }
        first={user.name}
        second={user.email}
        firstColor="text"
        gap="xxxsmall"
        truncate
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

export function UserGroupsExpand({
  row,
}: {
  row: Row<UserWithGroupsFragment>
}) {
  const user = row.original
  const groups = user.groups?.filter(isNonNullable) ?? []
  const [viewOpen, setViewOpen] = useState(false)
  const hasMore = groups.length > MEMBERSHIP_VISIBLE_ROWS

  return (
    <>
      <MembershipExpandPanel
        copyText={formatUserGroupsCopy(user, groups)}
        emptyMessage="This user is not in any groups."
        previewRows={Math.min(groups.length, MEMBERSHIP_VISIBLE_ROWS)}
        viewAll={hasMore ? { onClick: () => setViewOpen(true) } : undefined}
      >
        {groups.map((group) => (
          <MembershipListRowSC key={group.id}>
            <Body2P
              $color="text-light"
              css={TRUNCATE}
            >
              {group.name}
            </Body2P>
          </MembershipListRowSC>
        ))}
      </MembershipExpandPanel>
      <Modal
        header={`${user.name} groups`}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        scrollable={false}
      >
        <MembershipListSC
          css={{
            maxHeight: 480,
            overflow: 'auto',
          }}
        >
          {groups.map((group) => (
            <MembershipListRowSC key={group.id}>
              <Body2P
                $color="text-light"
                css={TRUNCATE}
              >
                {group.name}
              </Body2P>
            </MembershipListRowSC>
          ))}
        </MembershipListSC>
      </Modal>
    </>
  )
}

export const usersCols = [ColMembershipExpander, ColUser, ColGroups, ColAdmin]
