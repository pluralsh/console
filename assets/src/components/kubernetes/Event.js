import React from 'react'
import { Box } from 'grommet'
import { HeaderItem, RowItem } from './Pod'

function EventHeader() {
  return (
    <Box direction='row' align='center' gap='xsmall'>
      <HeaderItem width='10%' text='type' />
      <HeaderItem width='15%' text='action' />
      <HeaderItem width='15%' text='count' />
      <HeaderItem width='40%' text='message' />
      <HeaderItem width='20%' text='last seen' />
    </Box>
  )
}

function EventRow({event}) {
  return (
    <Box direction='row' align='center' gap='xsmall'>
      <RowItem width='10%' text={event.type} />
      <RowItem width='15%' text={event.action} />
      <RowItem width='15%' text={event.count} />
      <RowItem width='40%' text={event.message} />
      <RowItem width='20%' text={event.lastTimestamp} />
    </Box>
  )
}

export function Events({events}) {
  return (
    <Box flex={false} pad='small'>
      <EventHeader />
      {events.map((event, ind) => <EventRow key={ind} event={event} />)}
    </Box>
  )
}