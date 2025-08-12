import { EmptyState, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { ComponentProps, useMemo } from 'react'

import { useServiceAccountsQuery } from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import { useDebounce } from '@react-hooks-library/core'

import { ListWrapperSC } from '../users/UsersList'

import { serviceAccountsCols } from './ServiceAccountCols'

export const SERVICE_ACCOUNTS_QUERY_PAGE_SIZE = 100
export default function ServiceAccountsList({
  q,
  setQ,
}: {
  q: string
  setQ: (q: string) => void
}) {
  const debouncedQ = useDebounce(q, 100)

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
    () => data?.serviceAccounts?.edges?.map((edge) => edge?.node),
    [data?.serviceAccounts?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!serviceAccounts) return <LoadingIndicator />

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { q, gridTemplateColumns: '1fr auto' },
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
      {!isEmpty(serviceAccounts) ? (
        <GridTableWrapper>
          <Table
            virtualizeRows
            rowBg="raised"
            data={serviceAccounts || []}
            columns={serviceAccountsCols}
            hideHeader
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            reactTableOptions={reactTableOptions}
            css={{
              height: '100%',
            }}
          />
        </GridTableWrapper>
      ) : (
        <EmptyState
          message={
            isEmpty(q)
              ? "Looks like you don't have any service accounts yet."
              : `No service accounts found for ${q}`
          }
        />
      )}
    </ListWrapperSC>
  )
}
