import { Card, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import isEmpty from 'lodash/isEmpty'
import { ComponentProps } from 'react'

import { EventFragment } from 'generated/graphql'
import styled from 'styled-components'
import { DateTimeCol } from './table/DateTimeCol'
import { StackedText } from './table/StackedText'

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
    return (
      <EmptyStateCardSC>
        <StackedText
          css={{ textAlign: 'center', width: 480 }}
          gap="xxsmall"
          first="No events recorded yet"
          firstPartialType="body1Bold"
          firstColor="text"
          secondPartialType="body2"
          secondColor="text-light"
          second="This pod hasn't generated any events. As soon as events occur, they'll be listed here with details like timestamps and statuses."
        />
      </EmptyStateCardSC>
    )

  return (
    <Table
      data={events}
      columns={columns}
      maxHeight="calc(100vh - 244px)"
      {...props}
    />
  )
}

const EmptyStateCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}))
