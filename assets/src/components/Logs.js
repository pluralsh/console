import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { Box, Stack, Text } from 'grommet'
import { useQuery } from 'react-apollo'
import TinyQueue from 'tinyqueue'
import { DashboardHeader } from './Dashboards'
import { LOGS_Q } from './graphql/dashboards'
import moment from 'moment'
import { Close, Up } from 'grommet-icons'
import { BreadcrumbsContext } from './Breadcrumbs'
import { useHistory, useParams } from 'react-router'
import { BUILD_PADDING } from './Builds'
import { InstallationContext, useEnsureCurrent } from './Installations'
import SmoothScroller from './utils/SmoothScroller'
import { last } from 'lodash'

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
  let q = new TinyQueue([], ({head: {timestamp: left}}, {head: {timestamp: right}}) => right - left)
  for (const stream of streams) {
    if (!stream.values || !stream.values[0]) continue
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

function Placeholder() {
  return (
    <Box height='20px' flex={false} style={{fontFamily: 'monospace'}}>
      <Text size='small'>{'-'.repeat(20 + Math.ceil(Math.random() * 40))}</Text>
    </Box>
  )
}

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
          <Box key={key} direction='row' fill='horizontal' gap='small' flex={false}>
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

function LogContent({listRef, setListRef, logs, name, loading, fetchMore, onScroll}) {
  const [done, setDone] = useState(false)
  const end = useMemo(() => last(logs), [logs])
  const lines = useMemo(() => [...crossStreams(logs)], [logs])
  const start = useMemo(() => lines.length > 0 ? `${last(lines).line.timestamp}` : null, [lines])
  useEffect(() => {
    if (end && !end.values) {
      setDone(true)
    }
  }, [end, done])

  return (
    <SmoothScroller
      listRef={listRef}
      setListRef={setListRef}
      refreshKey={name}
      items={lines}
      mapper={({line, level, stream}) => <LogLine stream={stream} line={line} level={level} />}
      handleScroll={onScroll}
      loading={loading}
      placeholder={Placeholder}
      loadNextPage={() => !done && fetchMore({
        variables: {start},
        updateQuery: (prev, {fetchMoreResult: {logs}}) => ({...prev, logs: [...prev.logs, ...logs]})
      })}
      hasNextPage={!done} />
  )
}

function IndicatorContainer({children, ...props}) {
  return (
    <Box direction='row' gap='xsmall' background='sidebar' align='center'
          margin={{left: 'small', bottom: 'small'}} {...props}
          round='xxsmall' pad={{horizontal: 'small', vertical: '3px'}}>
      {children}
    </Box>
  )
}

function ScrollIndicator({live, returnToTop}) {
  if (live) {
    return (
      <IndicatorContainer>
        <Box round='full' background='status-ok' height='10px' width='10px' />
        <Text size='small' weight={500}>Live</Text>
      </IndicatorContainer>
    )
  }

  return (
    <IndicatorContainer onClick={returnToTop} hoverIndicator='sidebarHover'>
      <Text size='small'>return to top</Text>
      <Up size='small' />
    </IndicatorContainer>
  )
}

export default function Logs({repository: {name}}) {
  const [flyout, setFlyout] = useState(null)
  const [listRef, setListRef] = useState(null)
  const [live, setLive] = useState(true)
  const {data, loading, fetchMore, refetch} = useQuery(LOGS_Q, {
    variables: {query: `{namespace="${name}"}`},
    pollInterval: live ? POLL_INTERVAL : 0
  })
  const returnToTop = useCallback(() => {
    setLive(true)
    refetch().then(() => listRef.scrollToItem(0))
  }, [setLive, listRef])

  return (
    <FlyoutContext.Provider value={{setFlyout}}>
      <Box direction='row' fill background='console' gap='small'>
        <Stack fill anchor='bottom-left'>
          <Box fill style={{overflow: 'auto'}} pad={{top: 'small', horizontal: 'small'}}>
            {data && (
              <LogContent
                listRef={listRef}
                setListRef={setListRef}
                name={name}
                logs={data.logs}
                loading={loading}
                fetchMore={fetchMore}
                onScroll={(arg) => setLive(!arg)} />
            )}
          </Box>
          <ScrollIndicator live={live} returnToTop={returnToTop} />
        </Stack>
        {flyout}
      </Box>
    </FlyoutContext.Provider>
  )
}

export function LogViewer() {
  const {repo} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange, currentInstallation} = useContext(InstallationContext)
  const repository = currentInstallation.repository
  let history = useHistory()
  useEffect(() => {
    setBreadcrumbs([
      {text: 'logs', url: '/logs'},
      {text: repository.name, url: `/logs/${repository.name}`}
    ])
  }, [repository])
  useEffect(() => {
    setOnChange({func: ({repository: {name}}) => history.push(`/logs/${name}`)})
  }, [])
  useEnsureCurrent(repo)

  return (
    <Box fill>
      <Box gap='small' flex={false}>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row' align='center' height='60px'>
          <Box direction='row' fill='horizontal' gap='small' align='center'>
            {repository.icon && <img alt='' src={repository.icon} height='40px' width='40px' />}
            <DashboardHeader name={repository.name} label='log streams' />
          </Box>
        </Box>
      </Box>
      <Logs repository={repository} />
    </Box>
  )
}