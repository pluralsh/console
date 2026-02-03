import { Input, SearchIcon, Table } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { ComponentProps, useMemo } from 'react'

import { useServiceAccountsQuery } from 'generated/graphql'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import { useDebounce } from '@react-hooks-library/core'

import { ListWrapperSC } from '../users/UsersList'

import { useLogin } from 'components/contexts'
import { mapExistingNodes } from 'utils/graphql'
import { serviceAccountsCols } from './ServiceAccountCols'

export const SERVICE_ACCOUNTS_QUERY_PAGE_SIZE = 100

export function ServiceAccountsList({
  q,
  setQ,
}: {
  q: string
  setQ: (q: string) => void
}) {
  const debouncedQ = useDebounce(q, 100)
  const { me } = useLogin()
  const isAdmin = !!me?.roles?.admin

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceAccountsQuery,
        keyPath: ['serviceAccounts'],
        pageSize: SERVICE_ACCOUNTS_QUERY_PAGE_SIZE,
      },
      { q: debouncedQ }
    )

  const serviceAccounts = useMemo(
    () => mapExistingNodes(data?.serviceAccounts),
    [data?.serviceAccounts]
  )

  if (error) return <GqlError error={error} />

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { isAdmin },
  }

  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search an account"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        backgroundColor="fill-one"
      />
      <GridTableWrapper>
        <Table
          hideHeader
          virtualizeRows
          rowBg="raised"
          loading={!data && loading}
          data={serviceAccounts}
          columns={serviceAccountsCols}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          reactTableOptions={reactTableOptions}
          emptyStateProps={{
            message: isEmpty(q)
              ? "Looks like you don't have any service accounts yet."
              : `No service accounts found for ${q}`,
          }}
        />
      </GridTableWrapper>
    </ListWrapperSC>
  )
}
