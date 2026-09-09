import { Button, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useGroupsQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import {
  membershipExpandTableProps,
  useMembershipListPagination,
} from '../MembershipExpandPanel'
import { ListWrapperSC } from '../users/UsersList'
import { GROUP_CREATE_ID_KEY, GroupEditT } from './Groups'
import { GroupMembersExpand, groupsCols } from './GroupsColumns'

export type GroupsListMeta = {
  editable: boolean
  setGroupEdit: (group: Nullable<GroupEditT>) => void
}

export function GroupsList({
  setGroupEdit,
}: {
  setGroupEdit: (group: Nullable<GroupEditT>) => void
}) {
  const { me } = useLogin()
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 300)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useGroupsQuery, keyPath: ['groups'] },
      { q: throttledQ }
    )
  const groups = useMemo(() => mapExistingNodes(data?.groups), [data?.groups])
  const onVirtualSliceChange = useMembershipListPagination({
    itemCount: groups.length,
    hasNextPage: pageInfo?.hasNextPage,
    isFetching: loading,
    fetchNextPage,
    setVirtualSlice,
  })

  const meta: GroupsListMeta = {
    editable: !!me?.roles?.admin,
    setGroupEdit,
  }

  if (error) return <GqlError error={error} />

  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search groups"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        flexShrink={0}
      />
      <Table
        fullHeightWrap
        virtualizeRows
        {...membershipExpandTableProps}
        data={groups}
        loading={!data && loading}
        columns={groupsCols}
        reactTableOptions={{ meta }}
        onVirtualSliceChange={onVirtualSliceChange}
        renderExpanded={({ row }) => <GroupMembersExpand row={row} />}
        emptyStateProps={{
          ...(!throttledQ
            ? {
                message: "Looks like you don't have any groups yet.",
                children: (
                  <Button
                    floating
                    onClick={() => setGroupEdit(GROUP_CREATE_ID_KEY)}
                  >
                    Create group
                  </Button>
                ),
              }
            : { message: `No groups found for ${throttledQ}` }),
        }}
      />
    </ListWrapperSC>
  )
}
