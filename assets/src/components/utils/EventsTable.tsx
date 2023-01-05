import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { Event as EventT } from 'generated/graphql'
import { isEmptyIterable } from 'utils/iterables'
import { Date } from 'components/utils/Date'

const COLUMN_HELPER = createColumnHelper<EventT>()

const columns = [
  COLUMN_HELPER.accessor(event => event.type, {
    id: 'type',
    cell: type => type.getValue(),
    header: 'Type',
  }),
  COLUMN_HELPER.accessor(event => event.reason, {
    id: 'reason',
    cell: reason => reason.getValue(),
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor(event => event.message, {
    id: 'message',
    cell: message => message.getValue(),
    header: 'Message',
  }),
  COLUMN_HELPER.accessor(event => event.count, {
    id: 'count',
    cell: count => count.getValue(),
    header: 'Count',
  }),
  COLUMN_HELPER.accessor(event => event.lastTimestamp, {
    id: 'lastTimestamp',
    cell: lastTimestamp => <Date date={lastTimestamp.getValue()} />,
    header: 'Last seen',
  }),
]

export default function EventsTable({ events }: { events?: Iterable<EventT> }) {
  if (!events || isEmptyIterable(events)) {
    return <>No events available.</>
  }

  return (
    <Table
      data={events}
      columns={columns}
      maxHeight="calc(100vh - 244px)"
    />
  )
}
