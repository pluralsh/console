import { ListBoxItem, Select, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { StackInfracostResourceFragment } from 'generated/graphql'
import { StackRunInfracostResourcesDocument } from 'generated/graphql-documents'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mapExistingNodes } from 'utils/graphql'

import { StackRunOutletContextT } from '../Route'

// each page is costed at its size by the api's complexity limit
const PAGE_SIZE = 25

const SCOPES = [
  { key: 'breakdown', label: 'Current' },
  { key: 'past_breakdown', label: 'Previous' },
  { key: 'diff', label: 'Diff' },
  { key: 'free', label: 'Free' },
]

export default function StackRunCost(): ReactNode {
  const { stackRun } = useOutletContext<StackRunOutletContextT>()
  const [scope, setScope] = useState(SCOPES[0].key)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      query: StackRunInfracostResourcesDocument,
      keyPath: ['stackRun', 'infracostResources'],
      pageSize: PAGE_SIZE,
    },
    { id: stackRun.id, resourceScope: scope }
  )

  // costs are saved with the run's completion, so a status change can bring new rows
  const status = stackRun.status
  const lastStatus = useRef(status)
  useEffect(() => {
    if (lastStatus.current !== status) refetch()
    lastStatus.current = status
  }, [status, refetch])

  const resources = useMemo(
    () => mapExistingNodes(data?.stackRun?.infracostResources),
    [data?.stackRun?.infracostResources]
  )

  if (error) return <GqlError error={error} />

  return (
    <>
      <PageToolbarPortal>
        <Select
          label="Scope"
          selectedKey={scope}
          onSelectionChange={(key) => setScope(key as string)}
        >
          {SCOPES.map(({ key, label }) => (
            <ListBoxItem
              key={key}
              label={label}
            />
          ))}
        </Select>
      </PageToolbarPortal>
      <Table
        fullHeightWrap
        virtualizeRows
        css={{ maxHeight: '100%' }}
        data={resources}
        columns={columns}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No Infracost data for this run.' }}
      />
    </>
  )
}

const formatCost = (cost: Nullable<number>) =>
  cost == null
    ? '-'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(cost)

const columnHelper = createColumnHelper<StackInfracostResourceFragment>()

const columns = [
  columnHelper.accessor((r) => r.name, {
    id: 'name',
    header: 'Resource',
    meta: { truncate: true, gridTemplate: 'minmax(200px, 1fr)' },
    cell: ({ row: { original } }) => (
      <StackedText
        first={original.name}
        second={original.resourceType}
      />
    ),
  }),
  columnHelper.accessor((r) => r.projectName, {
    id: 'project',
    header: 'Project',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  columnHelper.accessor((r) => r.monthlyCost, {
    id: 'monthlyCost',
    header: 'Monthly',
    cell: ({ getValue }) => formatCost(getValue()),
  }),
  columnHelper.accessor((r) => r.monthlyUsageCost, {
    id: 'monthlyUsageCost',
    header: 'Monthly usage',
    cell: ({ getValue }) => formatCost(getValue()),
  }),
  columnHelper.accessor((r) => r.hourlyCost, {
    id: 'hourlyCost',
    header: 'Hourly',
    cell: ({ getValue }) => formatCost(getValue()),
  }),
]
