import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { Box, Stack, Text, TextInput } from 'grommet'
import { useQuery } from 'react-apollo'
import TinyQueue from 'tinyqueue'
import { DashboardHeader } from './Dashboards'
import { LOGS_Q } from './graphql/dashboards'
import moment from 'moment'
import { Close, Search, Up } from 'grommet-icons'
import { BreadcrumbsContext } from './Breadcrumbs'
import { useHistory, useParams } from 'react-router'
import { BUILD_PADDING } from './Builds'
import { ApplicationIcon, hasIcon, InstallationContext, useEnsureCurrent } from './Installations'
import SmoothScroller from './utils/SmoothScroller'
import { last } from 'lodash'
import { toMap, useQueryParams } from './utils/query'

const POLL_INTERVAL = 10 * 1000

const Level = {
  ERROR: 'e',
  INFO: 'i',
  WARN: 'w',
  OTHER: 'o',
  FATAL: 'f'
}

const FlyoutContext = React.createContext({})
const LabelContext = React.createContext({})

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
      <Box height='16px' width={`${40 + Math.ceil(Math.random() * 40)}%`} background='#444' />
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
  const {addLabel} = useContext(LabelContext)
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
          <Box key={key} direction='row' fill='horizontal' gap='small' flex={false}
               onClick={() => addLabel(key, value)} hoverIndicator='#444'>
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

function LogContent({listRef, setListRef, logs, name, loading, fetchMore, onScroll, search, setLoader}) {
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
      setLoader={setLoader}
      refreshKey={`${name}:${search}`}
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

export default function Logs({application: {name}, search}) {
  const {labels} = useContext(LabelContext)
  const [flyout, setFlyout] = useState(null)
  const [listRef, setListRef] = useState(null)
  const [live, setLive] = useState(true)
  const [loader, setLoader] = useState(null)
  const searchQuery = search.length > 0 ? ` |~ "${search}"` : ''
  const labelQuery = useMemo(() => (
    [...labels, {name: 'namespace', value: name}].map(({name, value}) => `${name}="${value}"`).join(',')
  ), [labels, name])
  const {data, loading, fetchMore, refetch} = useQuery(LOGS_Q, {
    variables: {query: `{${labelQuery}}${searchQuery}`},
    pollInterval: live ? POLL_INTERVAL : 0
  })
  const returnToTop = useCallback(() => {
    setLive(true)
    refetch().then(() => listRef.scrollToItem(0))
    loader.resetloadMoreItemsCache()
  }, [setLive, listRef, loader])

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
                setLoader={setLoader}
                search={`${searchQuery}:${labelQuery}`}
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

const animation = {
  outline: 'none',
  transition: 'width 0.75s cubic-bezier(0.000, 0.795, 0.000, 1.000)'
};

function LogLabels({labels}) {
  const {removeLabel} = useContext(LabelContext)
  return (
    <Box flex={false} style={{overflow: 'auto'}} fill direction='row' gap='xsmall' align='center' wrap>
      {labels.map(({name, value}) => (
        <Box gap='xsmall' direction='row' round='xsmall' pad={{horizontal: '7px', vertical: '2px'}} focusIndicator={false}
             align='center' background='light-3' hoverIndicator='light-6' onClick={() => removeLabel(name)}>
          <Text size='small' weight={500} truncate>{name}:</Text>
          <Text size='small' truncate>{value}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function LogViewer() {
  const {repo} = useParams()
  const query = useQueryParams()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const [labels, setLabels] = useState(toMap(query))
  const labelList = Object.entries(labels).map(([name, value]) => ({name, value}))
  const {setOnChange, currentApplication: app} = useContext(InstallationContext)
  let history = useHistory()
  useEffect(() => {
    setBreadcrumbs([
      {text: 'logs', url: '/logs'},
      {text: app.name, url: `/logs/${app.name}`}
    ])
  }, [app])
  useEffect(() => {
    setOnChange({func: ({name}) => history.push(`/logs/${name}`)})
  }, [])
  useEnsureCurrent(repo)
  const addLabel = useCallback((name, value) => setLabels({...labels, [name]: value}), [labels, setLabels])
  const removeLabel = useCallback((name) => {
    const {[name]: _val, ...rest} = labels
    setLabels(rest)
  }, [labels, setLabels])

  return (
    <LabelContext.Provider value={{addLabel, removeLabel, labels: labelList}}>
      <Box fill>
        <Box gap='small' flex={false}>
          <Box pad={{vertical: 'small', ...BUILD_PADDING}} gap='medium'
              direction='row' fill='horizontal' align='center' height='80px'>
            <Box direction='row' fill='horizontal' gap='small' align='center'>
              {hasIcon(app) && <ApplicationIcon application={app} size='40px' />}
              <Box gap='xsmall'>
                <DashboardHeader name={app.name} label='log streams' />
                {labelList.length > 0 && <LogLabels labels={labelList} />}
              </Box>
            </Box>
            <Box flex={false} style={animation} width={expanded ? '50%' : '200px'}
                direction='row' align='center' border={expanded ? {side: 'bottom', color: 'brand'} : 'bottom'}
                onClick={() => setExpanded(true)} focusIndicator={false} justify='end'>
              <Search size='20px' />
              <TextInput
                plain
                onBlur={() => setExpanded(false)}
                size='small'
                style={animation}
                value={search}
                onChange={({target: {value}}) => setSearch(value)}
                placeholder='this is for searching' />
            </Box>
          </Box>
        </Box>
        <Logs application={app} search={search} />
      </Box>
    </LabelContext.Provider>
  )
}