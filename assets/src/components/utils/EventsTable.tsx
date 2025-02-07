import { EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import isEmpty from 'lodash/isEmpty'
import { ComponentProps } from 'react'

import { DateTimeCol } from './table/DateTimeCol'
import { EventFragment } from 'generated/graphql'

const COLUMN_HELPER = createColumnHelper<EventFragment>()

const columns = [
  COLUMN_HELPER.accessor((event) => event.type, {
    id: 'type',
    cell: (type) => type.getValue(),
    header: 'Type',
  }),
  COLUMN_HELPER.accessor((event) => event.reason, {
    id: 'reason',
    cell: (reason) => reason.getValue(),
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor((event) => event.message, {
    id: 'message',
    cell: (message) => message.getValue(),
    header: 'Message',
  }),
  COLUMN_HELPER.accessor((event) => event.count, {
    id: 'count',
    cell: (count) => count.getValue(),
    header: 'Count',
  }),
  COLUMN_HELPER.accessor((event) => event.lastTimestamp, {
    id: 'lastTimestamp',
    cell: (lastTimestamp) => <DateTimeCol date={lastTimestamp.getValue()} />,
    header: 'Last seen',
  }),
]

export default function EventsTable({
  events,
  ...props
}: { events?: Nullable<EventFragment>[] } & Partial<
  ComponentProps<typeof Table>
>) {
  if (!events || isEmpty(events))
    return <EmptyState message="No events available." />

  return (
    <Table
      data={events}
      columns={columns}
      maxHeight="calc(100vh - 244px)"
      {...props}
    />
  )
}
