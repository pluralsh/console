import { Date, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { PodCondition as PodConditionT } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'

const COLUMN_HELPER = createColumnHelper<PodConditionT>()

const columns = [
  COLUMN_HELPER.accessor(condition => condition.lastTransitionTime, {
    id: 'timestamp',
    cell: lastTransitionTime => <Date date={lastTransitionTime.getValue()} />,
    header: 'Timestamp',
  }),
  COLUMN_HELPER.accessor(condition => condition.type, {
    id: 'type',
    cell: type => type.getValue(),
    header: 'Type',
  }),
  COLUMN_HELPER.accessor(condition => condition.status, {
    id: 'status',
    cell: status => status.getValue(),
    header: 'Status',
  }),
  COLUMN_HELPER.accessor(condition => condition.reason, {
    id: 'reason',
    cell: reason => reason.getValue() ?? '-',
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor(condition => condition.message, {
    id: 'message',
    cell: message => message.getValue() ?? '-',
    header: 'Message',
  }),

]

export default function PodConditions({ conditions }: { conditions?: PodConditionT[] }) {
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
