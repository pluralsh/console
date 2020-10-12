import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Box, Text } from 'grommet'
import { useQuery } from 'react-apollo'
import TinyQueue from 'tinyqueue'
import { DashboardHeader } from './Dashboards'
import { LOGS_Q } from './graphql/dashboards'
import moment from 'moment'
import { Close } from 'grommet-icons'

const POLL_INTERVAL = 10 * 1000

const Level = {
  ERROR: 'e',
  INFO: 'i',
  WARN: 'w',
  OTHER: 'o',
  FATAL: 'f'
}

const FlyoutContext = React.createContext({})

function determineLevel(line) {
  console.log(line)
  if (/fatal/i.test(line)) return Level.FATAL
  if (/error/i.test(line)) return Level.ERROR
  if (/warn/i.test(line)) return Level.WARN
  if (/info/i.test(line)) return Level.INFO
  return Level.OTHER
}

function borderColor(lvl) {
  switch (lvl) {
    case Level.FATAL:
      return 'success'
    case Level.ERROR:
      return 'success'
    case Level.WARN:
      return 'status-warning'
    case Level.INFO:
      return 'status-ok'
    default:
      return 'dark-6'
  }
}

// ghostbusters!
function* crossStreams(streams) {
  let q = new TinyQueue([], ({head: {timestamp: left}}, {head: {timestamp: right}}) => left - right)
  for (const stream of streams) {
    console.log(stream)
    if (!stream.values[0]) continue
    q.push({head: stream.values[0], stream, ind: 0})
  }

  while (q.length) {
    const {head, stream, ind} = q.pop()
    yield {line: head, level: determineLevel(head.value), stream: stream.stream}
    if (stream.values[ind + 1]) {
      q.push({head: stream.values[ind + 1], stream, ind: ind + 1})
    }
  }
}

const ts = (timestamp) => moment(new Date(Math.round(timestamp / (1000 * 1000)))).format()

function LogLine({line: {timestamp, value}, stream, level}) {
  const {setFlyout} = useContext(FlyoutContext)
  return (
    <Box border={{side: 'left', color: borderColor(level), size: '3px'}} flex={false} style={{fontFamily: 'monospace'}}
         direction='row' gap='small' hoverIndicator='#444' onClick={() => setFlyout(<LogInfo stamp={timestamp} stream={stream} />)}
         pad={{horizontal: 'xsmall'}} margin={{bottom: '1px'}}>
      <Box flex={false}>
        <Text size='small' weight={500}>{ts(timestamp)}</Text>
      </Box>
      <Box fill='horizontal'>
        <Text size='small'>{value}</Text>
      </Box>
    </Box>
  )
}

function LogInfo({stream, stamp}) {
  const {setFlyout} = useContext(FlyoutContext)
  return (
    <Box flex={false} width='30%' fill='vertical' style={{overflow: 'auto'}} border={{side: 'left'}}>
      <Box background='#444' direction='row' pad={{horizontal: 'small', vertical: 'xsmall'}}
           align='center'>
        <Box fill='horizontal'>
          <Text size='small' weight='bold'>Log Info</Text>
        </Box>
        <Box flex={false} pad='xsmall' round='xsmall' onClick={() => setFlyout(null)} hoverIndicator='console'>
          <Close size='small' />
        </Box>
      </Box>
      <Box fill pad='small' style={{fontFamily: 'monospace'}}>
        {[['timestamp', ts(stamp)], ...Object.entries(stream)].map(([key, value]) => (
          <Box direction='row' fill='horizontal' gap='small' flex={false}>
            <Box flex={false} width='50%'>
              <Text size='small' weight='bold' truncate>{key}</Text>
            </Box>
            <Box width='50%'>
              <Text size='small'>{value}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function LogContent({logs}) {
  const lines = useMemo(() => [...crossStreams(logs)], [logs])
  console.log(lines)
  return lines.map(({line, level, stream}) => <LogLine stream={stream} line={line} level={level} />)
}

export default function Logs({repository: {name}, setModifier}) {
  const [flyout, setFlyout] = useState(null)
  const {data} = useQuery(LOGS_Q, {
    variables: {query: `{namespace="${name}"}`},
    pollInterval: POLL_INTERVAL
  })
  useEffect(() => setModifier(<DashboardHeader name={name} label='logs' />), [])

  return (
    <FlyoutContext.Provider value={{setFlyout}}>
      <Box direction='row' fill background='console' gap='small'>
        <Box fill style={{overflow: 'auto'}} pad={{top: 'small', horizontal: 'small'}}>
          {data && <LogContent logs={data.logs} />}
        </Box>
        {flyout}
      </Box>
    </FlyoutContext.Provider>
  )
}