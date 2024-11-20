import { Table } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColStatus,
  ColTitle,
} from 'components/pr/queue/PrQueueColumns'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'

export const columns = [
  ColTitle,
  ColStatus,
  ColCreator,
  ColInsertedAt,
  ColActions,
]

export function PrTable({
  refetch,
  data,
  ...props
}: {
  refetch?
  data
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (!data) {
    return <TableSkeleton />
  }

  return (
    <Table
      loose
      fillLevel={1}
      data={data}
      columns={columns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      reactTableOptions={reactTableOptions}
      {...props}
    />
  )
}
