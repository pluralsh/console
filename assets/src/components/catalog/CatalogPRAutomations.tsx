import { Table } from '@pluralsh/design-system'
import { columns } from '../pr/automations/PrAutomationsColumns.tsx'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../utils/table/useFetchPaginatedData.tsx'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap.tsx'
import { usePrAutomationsQuery } from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'

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
    <FullHeightTableWrap>
      <Table
        columns={columns}
        reactTableOptions={{ meta: { refetch } }}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        data={prAutomations}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
