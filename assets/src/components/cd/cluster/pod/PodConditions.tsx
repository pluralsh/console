import {
  Maybe,
  PodCondition as PodConditionT,
} from '../../../../generated/graphql.ts'
import isEmpty from 'lodash/isEmpty'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { DateTimeCol } from '../../../utils/table/DateTimeCol.tsx'
import { TableText } from '../../../cluster/TableElements.tsx'

const COLUMN_HELPER = createColumnHelper<PodConditionT>()

const columns = [
  COLUMN_HELPER.accessor((condition) => condition.lastTransitionTime, {
    id: 'timestamp',
    cell: (lastTransitionTime) => (
      <DateTimeCol date={lastTransitionTime.getValue()} />
    ),
    header: 'Timestamp',
  }),
  COLUMN_HELPER.accessor((condition) => condition.type, {
    id: 'type',
    cell: (type) => <TableText>{type.getValue()}</TableText>,
    header: 'Type',
  }),
  COLUMN_HELPER.accessor((condition) => condition.status, {
    id: 'status',
    cell: (status) => <TableText>{status.getValue()}</TableText>,
    header: 'Status',
  }),
  COLUMN_HELPER.accessor((condition) => condition.reason, {
    id: 'reason',
    cell: (reason) => <TableText>{reason.getValue() ?? '-'}</TableText>,
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor((condition) => condition.message, {
    id: 'message',
    cell: (message) => <TableText>{message.getValue() ?? '-'}</TableText>,
    header: 'Message',
  }),
]

export function PodConditions({
  conditions,
}: {
  conditions?: Maybe<PodConditionT>[]
}) {
  if (!conditions || isEmpty(conditions)) {
    return <>No conditions available.</>
  }

  return (
    <Table
      data={conditions}
      columns={columns}
      maxHeight="calc(100vh - 244px)"
    />
  )
}
