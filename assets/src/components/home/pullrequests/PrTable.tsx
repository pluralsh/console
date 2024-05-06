import { Table } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { prColumns } from 'components/pr/queue/PrQueueColumns'
import { PRS_REACT_VIRTUAL_OPTIONS } from 'components/pr/queue/PrQueue'

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

  return (
    <Table
      loose
      data={data}
      columns={prColumns}
      reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
      reactTableOptions={reactTableOptions}
      {...props}
    />
  )
}
