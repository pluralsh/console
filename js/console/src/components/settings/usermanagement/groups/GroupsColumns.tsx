import { EyeIcon, IconFrame, Modal, PencilIcon } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { StackedText } from 'components/utils/table/StackedText'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  GroupFragment,
  GroupMembersQuery,
  useDeleteGroupMutation,
  useGroupMembersLazyQuery,
  useGroupMembersQuery,
} from 'generated/graphql'
import { useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColMembershipExpander,
  HoverActions,
  MembershipExpandPanel,
  MembershipUserRow,
  MEMBERSHIP_FETCH_LIMIT,
  MEMBERSHIP_VISIBLE_ROWS,
} from '../MembershipExpandPanel'
import { formatGroupMembersCopy } from '../membershipCopy'
import { GroupMembers } from './GroupMembers'
import type { GroupsListMeta } from './GroupsList'

const COPY_MEMBERS_PAGE_SIZE = 1000

const columnHelper = createColumnHelper<GroupFragment>()

const ColGroupInfo = columnHelper.accessor((group) => group, {
  id: 'info',
  header: 'Groups',
  meta: { gridTemplate: 'minmax(0, 1fr)' },
  cell: function Cell({ getValue }) {
    const group = getValue()

    return (
      <StackedText
        first={group?.name}
        second={group?.description || 'no description'}
        firstColor="text"
        gap="xxxsmall"
        truncate
      />
    )
  },
})

const ColMembers = columnHelper.accessor((group) => group.memberCount ?? 0, {
  id: 'members',
  header: 'Members',
  meta: { gridTemplate: '90px' },
})

const ColActions = columnHelper.accessor((group) => group, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: 'fit-content(72px)' },
  cell: function Cell({ getValue, table: { options } }) {
    const group = getValue()
    const { editable, setGroupEdit } = options.meta as GroupsListMeta
    const { popToast } = useSimpleToast()
    const [dialogKey, setDialogKey] = useState<
      'viewGroup' | 'confirmDelete' | ''
    >('')

    const [mutation, { loading, error }] = useDeleteGroupMutation({
      variables: { id: group.id },
      onCompleted: () => {
        popToast({ content: `${group.name} deleted`, severity: 'success' })
        setDialogKey('')
      },
      refetchQueries: ['Groups'],
      awaitRefetchQueries: true,
    })

    return (
      <>
        <HoverActions>
          {editable ? (
            <>
              <IconFrame
                clickable
                size="small"
                tooltip="Edit group"
                icon={<PencilIcon />}
                onClick={() => setGroupEdit(group)}
              />
              <DeleteIconButton
                size="small"
                tooltip="Delete group"
                onClick={() => setDialogKey('confirmDelete')}
              />
            </>
          ) : (
            <IconFrame
              clickable
              size="small"
              tooltip="View group"
              icon={<EyeIcon />}
              onClick={() => setDialogKey('viewGroup')}
            />
          )}
        </HoverActions>
        <ViewGroupMembersModal
          group={group}
          open={dialogKey === 'viewGroup'}
          onClose={() => setDialogKey('')}
        />
        <Confirm
          open={dialogKey === 'confirmDelete'}
          text={
            <>
              Are you sure you want to delete the <b>{group.name}</b> group?
              This could have downstream effects on a large number of users and
              their roles.
            </>
          }
          close={() => setDialogKey('')}
          label="Delete group"
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    )
  },
})

export function GroupMembersExpand({
  row,
  editable,
  setGroupEdit,
}: {
  row: Row<GroupFragment>
} & GroupsListMeta) {
  const group = row.original
  const [viewOpen, setViewOpen] = useState(false)
  const [fetchMembers] = useGroupMembersLazyQuery()
  const { data, loading, error } = useGroupMembersQuery({
    variables: { id: group.id, first: MEMBERSHIP_FETCH_LIMIT },
  })
  const users = membersFromQuery(data)

  return (
    <>
      {error && <GqlError error={error} />}
      <MembershipExpandPanel
        loading={!data && loading}
        emptyMessage="This group has no members."
        getCopyText={() =>
          (group.memberCount ?? 0) <= users.length
            ? Promise.resolve(formatGroupMembersCopy(group, users))
            : getGroupMembersCopyText(fetchMembers, group)
        }
        viewAll={
          (group.memberCount ?? 0) > MEMBERSHIP_VISIBLE_ROWS
            ? {
                onClick: () =>
                  editable ? setGroupEdit(group) : setViewOpen(true),
              }
            : undefined
        }
      >
        {users.map((user) => (
          <MembershipUserRow
            key={user.id}
            name={user.name}
            email={user.email}
            avatar={user.profile}
          />
        ))}
      </MembershipExpandPanel>
      {!editable && (
        <ViewGroupMembersModal
          group={group}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
        />
      )}
    </>
  )
}

function ViewGroupMembersModal({
  group,
  open,
  onClose,
}: {
  group: GroupFragment
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      header={group.name}
      open={open}
      onClose={onClose}
    >
      <GroupMembers
        viewOnly
        groupId={group.id}
      />
    </Modal>
  )
}

async function getGroupMembersCopyText(
  fetchMembers: ReturnType<typeof useGroupMembersLazyQuery>[0],
  group: GroupFragment
) {
  const { data } = await fetchMembers({
    variables: { id: group.id, first: COPY_MEMBERS_PAGE_SIZE },
  })

  return formatGroupMembersCopy(group, membersFromQuery(data))
}

function membersFromQuery(data: Nullable<GroupMembersQuery>) {
  return mapExistingNodes(data?.groupMembers)
    .map((member) => member.user)
    .filter(isNonNullable)
}

export const groupsCols = [
  ColMembershipExpander,
  ColGroupInfo,
  ColMembers,
  ColActions,
]
