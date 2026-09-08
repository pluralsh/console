import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  IconFrame,
  ListBoxItem,
  Modal,
  PencilIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { Info } from 'components/utils/Info'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import UserInfo from 'components/utils/UserInfo'
import {
  GroupFragment,
  GroupMembersQuery,
  useDeleteGroupMutation,
  useGroupMembersLazyQuery,
  useGroupMembersQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { mapExistingNodes } from 'utils/graphql'
import {
  HoverActions,
  MembershipExpandPanel,
  MEMBERSHIP_VIEW_ALL_AFTER,
  MembershipListRowSC,
} from '../MembershipExpandPanel'
import { formatGroupMembersCopy } from '../membershipCopy'
import { GroupMembers } from './GroupMembers'
import type { GroupsListMeta } from './GroupsList'

const COPY_MEMBERS_PAGE_SIZE = 1000

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
  View = 'view',
}

const columnHelper = createColumnHelper<GroupFragment>()

const ColGroupInfo = columnHelper.accessor((group) => group, {
  id: 'info',
  header: 'Groups',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const group = getValue()

    return (
      <Info
        text={group?.name}
        description={group?.description || 'no description'}
      />
    )
  },
})

const ColMembers = columnHelper.accessor((group) => group.memberCount ?? 0, {
  id: 'members',
  header: 'Members',
  meta: { gridTemplate: '90px' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColActions = columnHelper.accessor((group) => group, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: 'max-content' },
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
          <CopyGroupListButton group={group} />
          <MoreMenu
            onSelectionChange={(key) => {
              if (key === MenuItemKey.Edit) setGroupEdit(group)
              else if (key === MenuItemKey.Delete)
                setDialogKey('confirmDelete')
              else if (key === MenuItemKey.View) setDialogKey('viewGroup')
            }}
          >
            {editable ? (
              <>
                <ListBoxItem
                  key={MenuItemKey.Edit}
                  leftContent={<PencilIcon />}
                  label="Edit group"
                  textValue="Edit group"
                />
                <ListBoxItem
                  key={MenuItemKey.Delete}
                  leftContent={<TrashCanIcon color="icon-danger" />}
                  label="Delete group"
                  textValue="Delete group"
                />
              </>
            ) : (
              <ListBoxItem
                key={MenuItemKey.View}
                leftContent={<EyeIcon />}
                label="View group"
                textValue="View group"
              />
            )}
          </MoreMenu>
        </HoverActions>
        <Modal
          header={group.name}
          open={dialogKey === 'viewGroup'}
          onClose={() => setDialogKey('')}
        >
          <GroupMembers
            viewOnly
            groupId={group.id}
          />
        </Modal>
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

function CopyGroupListButton({ group }: { group: GroupFragment }) {
  const [copied, setCopied] = useState(false)
  const [fetchMembers] = useGroupMembersLazyQuery()

  useEffect(() => {
    if (!copied) return

    const timeout = setTimeout(() => setCopied(false), 1000)

    return () => clearTimeout(timeout)
  }, [copied])

  const handleCopy = useCallback(
    async (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      const text = await getGroupMembersCopyText(fetchMembers, group)
      await window.navigator.clipboard.writeText(text)
      setCopied(true)
    },
    [fetchMembers, group]
  )

  return (
    <Tooltip
      label={copied ? 'Copied!' : 'Copy list'}
      placement="top"
    >
      <IconFrame
        clickable
        type="tertiary"
        icon={copied ? <CheckIcon /> : <CopyIcon />}
        onClick={handleCopy}
        textValue="Copy list"
      />
    </Tooltip>
  )
}

export function GroupMembersExpand({
  row,
  editable,
  setGroupEdit,
}: {
  row: Row<GroupFragment>
  editable: boolean
  setGroupEdit: GroupsListMeta['setGroupEdit']
}) {
  const group = row.original
  const [viewOpen, setViewOpen] = useState(false)
  const [fetchMembers] = useGroupMembersLazyQuery()
  const { data, loading, error } = useGroupMembersQuery({
    variables: { id: group.id, first: MEMBERSHIP_VIEW_ALL_AFTER },
  })
  const users = mapExistingNodes(data?.groupMembers)
    .map((member) => member.user)
    .filter(isNonNullable)

  return (
    <>
      {error && <GqlError error={error} />}
      <MembershipExpandPanel
        loading={!data && loading}
        emptyMessage="This group has no members."
        getCopyText={() => getGroupMembersCopyText(fetchMembers, group)}
        viewAll={
          (group.memberCount ?? 0) > MEMBERSHIP_VIEW_ALL_AFTER
            ? {
                label: `View all ${group.memberCount} members`,
                onClick: () =>
                  editable ? setGroupEdit(group) : setViewOpen(true),
              }
            : undefined
        }
      >
        {users.map((user) => (
          <MembershipListRowSC key={user.id}>
            <UserInfo
              user={{
                name: user.name,
                email: user.email,
                avatar: user.profile ?? undefined,
              }}
            />
          </MembershipListRowSC>
        ))}
      </MembershipExpandPanel>
      {!editable && (
        <Modal
          header={group.name}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
        >
          <GroupMembers
            viewOnly
            groupId={group.id}
          />
        </Modal>
      )}
    </>
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

export const groupsCols = [ColExpander, ColGroupInfo, ColMembers, ColActions]
