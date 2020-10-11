import React, { useEffect, useMemo } from 'react'
import { Box, Text } from 'grommet'
import { useQuery } from 'react-apollo'
import TinyQueue from 'tinyqueue'
import { DashboardHeader } from './Dashboards'
import { LOGS_Q } from './graphql/dashboards'
import { AnsiText } from './utils/AnsiText'
import moment from 'moment'

const POLL_INTERVAL = 30 * 1000

// ghostbusters!
function* crossStreams(streams) {
  let q = new TinyQueue([], ({head: {timestamp: left}}, {head: {timestamp: right}}) => left - right)
  for (const stream of streams) {
    if (!stream.values[0]) continue
    q.push({head: stream.values[0], stream, ind: 0})
  }

  while (q.length) {
    const {head, stream, ind} = q.pop()
    yield {line: head, streams: stream.stream}
    if (stream.values[ind + 1]) {
      q.push({head: stream.values[ind + 1], stream, ind: ind + 1})
    }
  }
}

function LogContent({logs}) {
  const lines = useMemo(() => [...crossStreams(logs)], [logs])

  return lines.map(({line: {value, timestamp}}) => (
    <Box direction='row' gap='small' height='19px' hoverIndicator='#444' onClick={() => null}>
      <Text size='small' weight={500}>{moment(new Date(Math.round(timestamp / 1000))).format()}</Text>
      <AnsiText text={value} />
    </Box>
  ))
}

export default function Logs({repository: {name}, setModifier}) {
  const {data} = useQuery(LOGS_Q, {variables: {query: `{namespace="${name}"}`}, pollInterval: POLL_INTERVAL})
  useEffect(() => setModifier(<DashboardHeader name={name} label='logs' />), [])

  return (
    <Box style={{overflow: 'auto'}} fill pad='small' background='console'>
      {data && <LogContent logs={data.logs} />}
    </Box>
  )
}