import {
  Button,
  EyeIcon,
  Flex,
  IconFrame,
  Modal,
  PencilIcon,
  Spinner,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { StackedText } from 'components/utils/table/StackedText'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import {
  GroupFragment,
  GroupMembersQuery,
  useDeleteGroupMutation,
  useGroupMembersLazyQuery,
  useGroupMembersQuery,
} from 'generated/graphql'
import { useEffect, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColMembershipExpander,
  HoverActions,
  MembershipExpandPanel,
  MembershipListRowSC,
  MembershipListSC,
  MembershipUserRow,
  MEMBERSHIP_FULL_LIST_LIMIT,
  MEMBERSHIP_GROUP_PAGE_AFTER,
  MEMBERSHIP_VISIBLE_ROWS,
} from '../MembershipExpandPanel'
import { formatGroupMembersCopy } from '../membershipCopy'
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
          onOpenGroup={editable ? () => setGroupEdit(group) : undefined}
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
  editable: boolean
  setGroupEdit: GroupsListMeta['setGroupEdit']
}) {
  const group = row.original
  const [viewOpen, setViewOpen] = useState(false)
  const [fetchMembers] = useGroupMembersLazyQuery()
  const { data, loading, error } = useGroupMembersQuery({
    variables: { id: group.id, first: MEMBERSHIP_VISIBLE_ROWS },
  })
  const users = membersFromQuery(data)
  const memberCount = group.memberCount ?? users.length
  const hasMore = memberCount > MEMBERSHIP_VISIBLE_ROWS

  return (
    <>
      {error && <GqlError error={error} />}
      <MembershipExpandPanel
        loading={!data && loading}
        emptyMessage="This group has no members."
        getCopyText={() => getGroupMembersCopyText(fetchMembers, group)}
        previewRows={Math.min(memberCount, MEMBERSHIP_VISIBLE_ROWS)}
        viewAll={hasMore ? { onClick: () => setViewOpen(true) } : undefined}
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
      <ViewGroupMembersModal
        group={group}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        onOpenGroup={editable ? () => setGroupEdit(group) : undefined}
      />
    </>
  )
}

function ViewGroupMembersModal({
  group,
  open,
  onClose,
  onOpenGroup,
}: {
  group: GroupFragment
  open: boolean
  onClose: () => void
  onOpenGroup?: () => void
}) {
  const { data, loading, error } = useGroupMembersQuery({
    variables: { id: group.id, first: MEMBERSHIP_FULL_LIST_LIMIT },
    skip: !open,
  })
  const users = membersFromQuery(data)
  const showEmpty = !!data && !loading && users.length === 0
  const canOpenGroup =
    !!onOpenGroup && (group.memberCount ?? 0) > MEMBERSHIP_FULL_LIST_LIMIT
  const [showGroupPage, setShowGroupPage] = useState(false)
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!sentinel || !canOpenGroup) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShowGroupPage(true)
    })

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [canOpenGroup, sentinel])

  const handleClose = () => {
    setShowGroupPage(false)
    onClose()
  }

  return (
    <Modal
      header={group.name}
      open={open}
      onClose={handleClose}
      size="large"
      scrollable={false}
    >
      {error && <GqlError error={error} />}
      <Flex
        direction="column"
        gap="small"
        minHeight={0}
      >
        <MembershipListSC
          css={{
            maxHeight: 480,
            overflow: 'auto',
          }}
        >
          {loading && !data && (
            <Flex
              justify="center"
              padding="medium"
            >
              <Spinner />
            </Flex>
          )}
          {showEmpty && (
            <MembershipListRowSC>
              <CaptionP $color="text-xlight">
                This group has no members.
              </CaptionP>
            </MembershipListRowSC>
          )}
          {users.map((user, i) => (
            <MembershipUserRow
              key={user.id}
              ref={
                canOpenGroup && i === MEMBERSHIP_GROUP_PAGE_AFTER - 1
                  ? setSentinel
                  : undefined
              }
              name={user.name}
              email={user.email}
              avatar={user.profile}
            />
          ))}
        </MembershipListSC>
        {showGroupPage && (
          <Button
            secondary
            onClick={() => {
              handleClose()
              onOpenGroup?.()
            }}
            width="fit-content"
          >
            See all on group page
          </Button>
        )}
      </Flex>
    </Modal>
  )
}

async function getGroupMembersCopyText(
  fetchMembers: ReturnType<typeof useGroupMembersLazyQuery>[0],
  group: GroupFragment
) {
  const { data, error } = await fetchMembers({
    variables: { id: group.id, first: COPY_MEMBERS_PAGE_SIZE },
  })

  if (error) throw error

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
