import { EmptyState, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { ComponentProps, useContext, useMemo, useState } from 'react'

import { useUsersQuery } from 'generated/graphql'

import { LoginContext } from 'components/contexts'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import styled from 'styled-components'

import UserInvite from './UserInvite'
import { usersCols } from './UsersColumns'

export default function UsersList() {
  const { configuration } = useContext<any>(LoginContext)
  const [q, setQ] = useState('')

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useUsersQuery, keyPath: ['users'] },
      { q }
    )

  const users = useMemo(
    () => data?.users?.edges?.map((edge) => edge?.node),
    [data?.users?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!data?.users?.edges) return <LoadingIndicator />

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
        backgroundColor="fill-one"
      />
      {!isEmpty(users) ? (
        <GridTableWrapper>
          <Table
            virtualizeRows
            rowBg="raised"
            data={users || []}
            columns={usersCols}
            hideHeader
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            reactTableOptions={reactTableOptions}
            height={'100%'}
          />
        </GridTableWrapper>
      ) : (
        <EmptyState
          message={
            isEmpty(q)
              ? "Looks like you don't have any users yet."
              : `No users found for ${q}`
          }
        >
          {/* Invites are only available when not using login with Plural. */}
          {configuration && !configuration?.pluralLogin && <UserInvite />}
        </EmptyState>
      )}
    </ListWrapperSC>
  )
}

export const ListWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
}))
