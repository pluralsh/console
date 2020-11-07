import React from 'react'
import { Box, Text } from 'grommet'
import { HeaderItem, RowItem } from './Pod'
import { EventType } from './constants'
import { Alert, StatusInfo } from 'grommet-icons'

function EventIcon({type}) {
  switch (type) {
    case EventType.Normal:
      return <StatusInfo color='progress' size='14px' />
    case EventType.Warning:
      return <Alert color='status-warning' size='14px' />
    default:
      return null
  }
}

function EventHeader() {
  return (
    <Box direction='row' align='center' gap='xsmall'>
      <HeaderItem width='10%' text='type' />
      <HeaderItem width='40%' text='message' />
      <HeaderItem width='15%' text='count' />
      <HeaderItem width='20%' text='last seen' />
    </Box>
  )
}

function EventRow({event}) {
  return (
    <Box direction='row' align='center' gap='xsmall' pad={{vertical: 'xsmall'}}>
      <Box flex={false} width='10%' direction='row' gap='xsmall' align='center'>
        <EventIcon type={event.type} />
        <Text size='small'>{event.type}</Text>
      </Box>
      <RowItem width='40%' text={event.message} />
      <RowItem width='15%' text={event.count} />
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