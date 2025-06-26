import { Table } from '@pluralsh/design-system'
import { columns } from '../pr/automations/PrAutomationsColumns.tsx'

import { usePrAutomationsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import {
  useFetchPaginatedData,
  DEFAULT_REACT_VIRTUAL_OPTIONS,
} from 'components/utils/table/useFetchPaginatedData.tsx'
import { mapExistingNodes } from 'utils/graphql.ts'

export function CatalogPRAutomations({ catalogId }: { catalogId: string }) {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: usePrAutomationsQuery, keyPath: ['prAutomations'] },
    { catalogId }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

  if (error) return <GqlError error={error} />

  if (!prAutomations && loading) return <LoadingIndicator />

  return (
    <Table
      fullHeightWrap
      columns={columns}
      reactTableOptions={{ meta: { refetch } }}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={prAutomations}
      virtualizeRows
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No PR automations found.' }}
    />
  )
}
