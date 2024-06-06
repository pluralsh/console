import { EmptyState, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { ComponentProps, useContext, useMemo, useState } from 'react'

import { useUsersQuery } from 'generated/graphql'

import { LoginContext } from 'components/contexts'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import UserInvite from './UserInvite'
import { usersCols } from './UsersColumns'

export default function UsersList() {
  const { configuration } = useContext<any>(LoginContext)
  const [q, setQ] = useState('')

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useUsersQuery, queryKey: 'users' },
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
    <>
      <Input
        value={q}
        placeholder="Search a user"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        backgroundColor="fill-one"
        marginBottom="small"
      />
      {!isEmpty(users) ? (
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={users || []}
            columns={usersCols}
            hideHeader
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            reactVirtualOptions={{ overscan: 10 }}
            reactTableOptions={reactTableOptions}
            css={{
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
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
    </>
  )
}
