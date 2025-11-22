import {
  GroupFragment,
  GroupMemberFragment,
  useDeleteGroupMemberMutation,
  useGroupMembersQuery,
} from 'generated/graphql'
import { useMemo } from 'react'

import { mapExistingNodes } from '../../../../utils/graphql'

import {
  IconFrame,
  Spinner,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import UserInfo from 'components/utils/UserInfo'

export default function GroupMembers({
  group,
  edit = false,
  skip = false,
}: {
  group: GroupFragment
  edit?: boolean
  skip?: boolean
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGroupMembersQuery,
        keyPath: ['groupMembers'],
        fetchPolicy: 'network-only',
        skip,
      },
      { id: group.id }
    )

  const members = useMemo(
    () => mapExistingNodes(data?.groupMembers),
    [data?.groupMembers]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      hideHeader
      rowBg="base"
      fillLevel={2}
      data={members}
      loading={!data && loading}
      columns={cols}
      reactTableOptions={{ meta: { edit } }}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'This group has no members.' }}
    />
  )
}

const columnHelper = createColumnHelper<GroupMemberFragment>()
const cols = [
  columnHelper.accessor((node) => node, {
    id: 'user',
    cell: function Cell({ getValue, table: { options } }) {
      const { user, group } = getValue()
      const edit = options.meta?.edit
      const [mutation, { loading }] = useDeleteGroupMemberMutation({
        refetchQueries: ['GroupMembers'],
      })

      if (!user || !group) return null

      return (
        <StretchedFlex>
          <UserInfo
            user={user}
            css={{ width: '100%' }}
          />
          {edit && (
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
                mutation({ variables: { groupId: group.id, userId: user.id } })
              }
            />
          )}
        </StretchedFlex>
      )
    },
  }),
]
