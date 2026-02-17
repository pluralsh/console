import {
  GroupMemberFragment,
  useDeleteGroupMemberMutation,
  useGroupMembersQuery,
  UserFragment,
} from 'generated/graphql'
import { useMemo } from 'react'

import { mapExistingNodes } from '../../../../utils/graphql'

import {
  GraphQLToast,
  IconFrame,
  SemanticColorKey,
  Spinner,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import UserInfo from 'components/utils/UserInfo'

type GroupMembersMeta = {
  viewOnly?: boolean
  removeMember: Nullable<(user: UserFragment) => void>
  popToast?: (name: string, action: string, color: SemanticColorKey) => void
}

export function GroupMembers({
  groupId,
  viewOnly,
  removeMember,
  newGroupUsers,
  popToast,
}: {
  groupId: Nullable<string>
  viewOnly?: boolean
  addMember?: (user: UserFragment) => void
  removeMember?: Nullable<(user: UserFragment) => void>
  newGroupUsers?: UserFragment[]
  popToast?: (name: string, action: string, color: SemanticColorKey) => void
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGroupMembersQuery,
        keyPath: ['groupMembers'],
        skip: !groupId,
      },
      { id: groupId ?? '' }
    )

  const members = useMemo(
    () =>
      groupId
        ? mapExistingNodes(data?.groupMembers)
        : (newGroupUsers?.map((user) => ({ user })) ?? []),
    [data?.groupMembers, groupId, newGroupUsers]
  )
  const meta: GroupMembersMeta = {
    viewOnly,
    removeMember,
    popToast,
  }

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      data={members}
      loading={!data && loading}
      loadingSkeletonRows={4}
      columns={cols}
      reactTableOptions={{ meta }}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'Add members to this group.' }}
    />
  )
}

const columnHelper = createColumnHelper<GroupMemberFragment>()
const cols = [
  columnHelper.accessor((node) => node, {
    id: 'user',
    cell: function Cell({ getValue, table: { options } }) {
      const { user, group } = getValue()
      const { viewOnly, removeMember, popToast } =
        options.meta as GroupMembersMeta
      const [mutation, { loading, error }] = useDeleteGroupMemberMutation({
        refetchQueries: ['GroupMembers'],
        awaitRefetchQueries: true,
        onCompleted: ({ deleteGroupMember }) =>
          popToast?.(
            deleteGroupMember?.user?.name ?? '',
            'removed',
            'icon-danger'
          ),
      })

      if (!user) return null

      return (
        <StretchedFlex>
          <UserInfo
            user={user}
            css={{ width: '100%' }}
          />
          {!viewOnly && (
            <IconFrame
              size="medium"
              clickable
              icon={
                loading ? <Spinner /> : <TrashCanIcon color="icon-danger" />
              }
              tooltip={
                <span>
                  Remove <b>{user.name}</b> from this group
                </span>
              }
              onClick={() =>
                !!removeMember
                  ? removeMember(user)
                  : mutation({
                      variables: { groupId: group?.id ?? '', userId: user.id },
                    })
              }
            />
          )}
          <GraphQLToast
            show={!!error}
            closeTimeout={6000}
            error={error}
            header="Error removing user from group"
            margin="xxlarge"
          />
        </StretchedFlex>
      )
    },
  }),
]
