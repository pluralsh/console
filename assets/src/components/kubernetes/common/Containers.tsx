import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Pod_Container as ContainerT,
  Maybe,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<ContainerT>()

interface ContainersProps {
  containers: Array<Maybe<ContainerT>>
}

const columns = [
  // Name
  columnHelper.accessor((container) => container?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  // Image
  columnHelper.accessor((container) => container?.image, {
    id: 'image',
    header: 'Image',
    cell: ({ getValue }) => getValue(),
  }),
  // Args
  columnHelper.accessor((container) => container?.args, {
    id: 'args',
    header: 'Args',
    cell: ({ getValue }) => getValue(),
  }),
  // Status
  columnHelper.accessor((container) => container?.status?.name, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => getValue(),
  }),
]

export default function Containers({
  containers,
}: ContainersProps): ReactElement {
  return (
    <Table
      data={containers}
      columns={columns}
      virtualizeRows
      css={{
        maxHeight: '500px',
        height: '100%',
      }}
    />
  )
}
