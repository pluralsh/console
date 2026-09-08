import { Input, SearchIcon, Table } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { ComponentProps, use, useMemo, useState } from 'react'

import { useUsersQuery } from 'generated/graphql'

import { LoginContext } from 'components/contexts'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import styled from 'styled-components'

import { mapExistingNodes } from 'utils/graphql'
import UserInvite from './UserInvite'
import { usersCols } from './UsersColumns'

export function UsersList() {
  const { configuration } = use(LoginContext)
  const [q, setQ] = useState('')

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useUsersQuery, keyPath: ['users'] },
      { q }
    )

  const users = useMemo(() => mapExistingNodes(data?.users), [data?.users])

  if (error) return <GqlError error={error} />

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { q, gridTemplateColumns: '1fr auto' },
  }

  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search a user"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        backgroundColor="fill-zero"
        flexShrink={0}
      />
      <Table
        hideHeader
        fullHeightWrap
        virtualizeRows
        rowBg="base"
        data={users}
        columns={usersCols}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactTableOptions={reactTableOptions}
        emptyStateProps={{
          message: isEmpty(q)
            ? "Looks like you don't have any users yet."
            : `No users found for ${q}`,
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
