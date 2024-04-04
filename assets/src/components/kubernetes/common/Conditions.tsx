import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Common_Condition as ConditionT,
  Maybe,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<ConditionT>()

interface ConditionsProps {
  conditions: Array<Maybe<ConditionT>>
  maxHeight?: string
}

const columns = [
  // Timestamp
  columnHelper.accessor((condition) => condition?.lastTransitionTime, {
    id: 'timestamp',
    header: 'Timestamp',
    cell: ({ getValue }) => getValue(),
  }),
  // Type
  columnHelper.accessor((condition) => condition?.type, {
    id: 'type',
    header: 'Type',
    cell: ({ getValue }) => getValue(),
  }),
  // Status
  columnHelper.accessor((condition) => condition?.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => getValue(),
  }),
  // Reason
  columnHelper.accessor((condition) => condition?.reason, {
    id: 'reason',
    header: 'Reason',
    cell: ({ getValue }) => getValue() || '-',
  }),
  // Message
  columnHelper.accessor((condition) => condition?.message, {
    id: 'message',
    header: 'Message',
    cell: ({ getValue }) => getValue() || '-',
  }),
]

export default function Conditions({
  conditions,
  maxHeight = '500px',
}: ConditionsProps): ReactElement {
  return (
    <Table
      data={conditions}
      columns={columns}
      css={{
        height: '100%',
        ...(maxHeight ? { maxHeight } : {}),
      }}
    />
  )
}
