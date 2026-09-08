import { Input, SearchIcon, Table } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useUsersQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { membershipExpandTableProps } from '../MembershipExpandPanel'
import UserInvite from './UserInvite'
import { UserGroupsExpand, usersCols } from './UsersColumns'

export function UsersList() {
  const { configuration } = useLogin()
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 300)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useUsersQuery, keyPath: ['users'] },
      { q: throttledQ }
    )

  const users = useMemo(() => mapExistingNodes(data?.users), [data?.users])

  if (error) return <GqlError error={error} />

  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search users"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        flexShrink={0}
      />
      <Table
        fullHeightWrap
        virtualizeRows
        {...membershipExpandTableProps}
        data={users}
        columns={usersCols}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        renderExpanded={({ row }) => <UserGroupsExpand row={row} />}
        emptyStateProps={{
          message: !throttledQ
            ? "Looks like you don't have any users yet."
            : `No users found for ${throttledQ}`,
          // invites are only available when not using login with Plural.
          children: configuration && !configuration?.pluralLogin && (
            <UserInvite />
          ),
        }}
      />
    </ListWrapperSC>
  )
}

export const ListWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
  minHeight: 0,
}))
