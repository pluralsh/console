import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Card,
  Input,
  PageTitle,
  SearchIcon,
} from '@pluralsh/design-system'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { toMap, useQueryParams } from 'components/utils/query'
import { Box, Stack } from 'grommet'
import TinyQueue from 'tinyqueue'
import moment from 'moment'
import { Checkmark, Close, Up } from 'grommet-icons'
import { LOG_FILTER_Q } from 'components/graphql/plural'
import { useQuery } from 'react-apollo'
import { LOGS_Q } from 'components/graphql/dashboards'
import { AnsiLine } from 'components/utils/AnsiText'
import LegacyScroller from 'components/utils/LegacyScroller'
import { last } from 'lodash'

import LogsLabels from './LogsLabels'
import LogsDownloader from './LogsDownloader'

const POLL_INTERVAL = 10 * 1000
const LIMIT = 1000

const Level = {
  ERROR: 'e',
  INFO: 'i',
  WARN: 'w',
  OTHER: 'o',
  FATAL: 'f',
}

const FlyoutContext = createContext<any>({})
const LabelContext = createContext<any>({})

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
  const q = new TinyQueue<any>([], ({ head: { timestamp: left } }, { head: { timestamp: right } }) => right - left)

  for (const stream of streams) {
    if (!stream.values || !stream.values[0]) continue
    q.push({ head: stream.values[0], stream, ind: 0 })
  }

  while (q.length) {
    const { head, stream, ind } = q.pop()

    yield { line: head, level: determineLevel(head.value), stream: stream.stream }
    if (stream.values[ind + 1]) {
      q.push({ head: stream.values[ind + 1], stream, ind: ind + 1 })
    }
  }
}

const ts = timestamp => moment(new Date(Math.round(timestamp / (1000 * 1000)))).format()

function Placeholder() {
  return (
    <Box
      height="20px"
      flex={false}
      style={{ fontFamily: 'monospace' }}
    >
      <Box
        height="16px"
        width={`${40 + Math.ceil(Math.random() * 40)}%`}
        background="#444"
      />
    </Box>
  )
}

function LogLine({ line: { timestamp, value }, stream, level }) {
  const { setFlyout } = useContext(FlyoutContext)

  return (
    <Box
      flex={false}
      pad={{ left: 'small' }}
      hoverIndicator="card"
      onClick={() => setFlyout(<LogInfo
        stamp={timestamp}
        stream={stream}
      />)}
    >
      <Box
        border={{ side: 'left', color: borderColor(level), size: '3px' }}
        style={{ fontFamily: 'monospace' }}
        direction="row"
        gap="small"
        pad={{ horizontal: 'xsmall' }}
        margin={{ bottom: '1px' }}
      >
        <Box flex={false}>
          {ts(timestamp)}
        </Box>
        <Box
          fill="horizontal"
          direction="row"
        >
          <AnsiLine line={value} />
        </Box>
      </Box>
    </Box>
  )
}

function LogInfo({ stream, stamp }) {
  const { setFlyout } = useContext(FlyoutContext)
  const { addLabel } = useContext(LabelContext)

  return (
    <Box
      flex={false}
      width="30%"
      fill="vertical"
      style={{ overflow: 'auto' }}
      border={{ side: 'left' }}
    >
      <Box
        background="card"
        direction="row"
        pad={{ horizontal: 'small', vertical: 'xsmall' }}
        align="center"
      >
        <Box fill="horizontal">
          Log Info
        </Box>
        <Box
          flex={false}
          pad="xsmall"
          round="xsmall"
          onClick={() => setFlyout(null)}
          hoverIndicator="cardHover"
        >
          <Close size="small" />
        </Box>
      </Box>
      <Box
        fill
        style={{ fontFamily: 'monospace' }}
      >
        {[['timestamp', ts(stamp)], ...Object.entries(stream)].map(([key, value]) => (
          <Box
            key={key}
            direction="row"
            fill="horizontal"
            gap="small"
            flex={false}
            onClick={() => addLabel(key, value)}
            hoverIndicator="card"
            pad={{ horizontal: 'small', vertical: 'xsmall' }}
          >
            <>
              {key}
              {value}
              {/* TRUNCATE */}
            </>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function LogContent({
  listRef, setListRef, logs, name, loading, fetchMore, onScroll, search, setLoader,
}) {
  const [done, setDone] = useState(false)
  const end = useMemo<any>(() => last(logs), [logs])
  const lines = useMemo(() => [...crossStreams(logs)], [logs])
  const start = useMemo(() => (lines.length > 0 ? `${last(lines)?.line?.timestamp}` : null), [lines])

  useEffect(() => {
    if (!end?.values) {
      setDone(true)
    }
  }, [end, done])

  return (
    <LegacyScroller
      listRef={listRef}
      setListRef={setListRef}
      setLoader={setLoader}
      refreshKey={`${name}:${search}`}
      items={lines}
      mapper={({ line, level, stream }) => (
        <LogLine
          stream={stream}
          line={line}
          level={level}
        />
      )}
      handleScroll={onScroll}
      loading={loading}
      placeholder={Placeholder}
      loadNextPage={() => !done && fetchMore({
        variables: { start },
        updateQuery: (prev, { fetchMoreResult: { logs } }) => ({ ...prev, logs: [...prev.logs, ...logs] }),
      })}
      hasNextPage={!done}
    />
  )
}

function IndicatorContainer({ children, ...props }) {
  return (
    <Box
      direction="row"
      gap="xsmall"
      background="sidebar"
      align="center"
      margin={{ left: 'small', bottom: 'small' }}
      {...props}
      round="xxsmall"
      pad={{ horizontal: 'small', vertical: '3px' }}
    >
      {children}
    </Box>
  )
}

function ScrollIndicator({ live, returnToTop }) {
  if (live) {
    return (
      <IndicatorContainer>
        <Box
          round="full"
          background="status-ok"
          height="10px"
          width="10px"
        />
        Live
      </IndicatorContainer>
    )
  }

  return (
    <IndicatorContainer
      onClick={returnToTop}
      hoverIndicator="sidebarHover"
    >
      return to top
      <Up size="small" />
    </IndicatorContainer>
  )
}

export function Logss({ application: { name }, query }) {
  const [flyout, setFlyout] = useState(null)
  const [listRef, setListRef] = useState<any>(null)
  const [live, setLive] = useState(true)
  const [loader, setLoader] = useState<any>(null)

  const {
    data, loading, fetchMore, refetch,
  } = useQuery(LOGS_Q, {
    variables: { query, limit: LIMIT },
    pollInterval: live ? POLL_INTERVAL : 0,
  })

  const returnToTop = useCallback(() => {
    setLive(true)
    refetch().then(() => listRef?.scrollToItem(0))
    loader?.resetloadMoreItemsCache()
  }, [refetch, setLive, listRef, loader])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <FlyoutContext.Provider value={{ setFlyout }}>
      <Box
        direction="row"
        fill
        gap="small"
      >
        <Stack
          fill
          anchor="bottom-left"
        >
          <Box
            fill
            pad={{ vertical: 'xsmall' }}
          >
            {data && (
              <LogContent
                listRef={listRef}
                setListRef={setListRef}
                name={name}
                logs={data.logs}
                setLoader={setLoader}
                search={query}
                loading={loading}
                fetchMore={fetchMore}
                onScroll={arg => setLive(!arg)}
              />
            )}
          </Box>
          <ScrollIndicator
            live={live}
            returnToTop={returnToTop}
          />
        </Stack>
        {flyout}
      </Box>
    </FlyoutContext.Provider>
  )
}

function selectedFilter(labels, search, spec) {
  if ((spec.query || '') !== search) return false

  for (const { name, value } of spec.labels) {
    if (labels[name] !== value) return false
  }

  return true
}

function LogFilters({
  namespace, labels, search, setSearch, setLabels,
}) {
  const { data } = useQuery(LOG_FILTER_Q, { variables: { namespace } })
  const select = useCallback(({ query, labels }) => {
    if (labels) {
      setLabels(labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {}))
    }
    setSearch(query || '')
  }, [setSearch, setLabels])
  const clear = useCallback(() => {
    setSearch('')
    setLabels({})
  }, [setSearch, setLabels])

  if (!data || data.logFilters.length === 0) return null

  const { logFilters } = data

  return (
    <Box
      width="250px"
      flex={false}
    >
      <Box
        fill
        style={{ overflow: 'auto' }}
        gap="xsmall"
        pad="small"
      >
        <Box
          flex={false}
          gap="xsmall"
        >
          {logFilters.map(({ metadata: { name }, spec }) => {
            const selected = selectedFilter(labels, search, spec)

            return (
              <Box
                key={name}
                pad={{ vertical: 'xsmall', horizontal: 'small' }}
                background="card"
                hoverIndicator="cardHover"
                onClick={selected ? clear : () => select(spec)}
                focusIndicator={false}
                round="xsmall"
                direction="row"
                gap="xsmall"
                align="center"
              >
                <Box>
                  {spec.name}
                  {spec.description}
                </Box>
                {selected && <Checkmark size="15px" />}
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

export default function Logs() {
  const { appName } = useParams()
  const query = useQueryParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const [search, setSearch] = useState('')
  const [labels, setLabels] = useState(toMap(query))

  const addLabel = useCallback((name, value) => setLabels({ ...labels, [name]: value }), [labels, setLabels])
  const removeLabel = useCallback(name => {
    const { [name]: _val, ...rest } = labels

    setLabels(rest)
  }, [labels, setLabels])

  const currentApp = applications.find(app => app.name === appName)
  const searchQuery = search.length > 0 ? ` |~ "${search}"` : ''
  const labelList = Object.entries(labels).map(([name, value]) => ({ name, value }))
  const labelQuery = useMemo(() => (
    [...labelList, { name: 'namespace', value: appName }].map(({ name, value }) => `${name}="${value}"`).join(',')
  ), [labelList, appName])
  const logQuery = `{${labelQuery}}${searchQuery}`

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Logs', url: `/apps/${appName}/logs` },
  ]), [appName, setBreadcrumbs])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <LabelContext.Provider value={{ addLabel, removeLabel, labels: labelList }}>
      <PageTitle heading="Logs">
        <LogsDownloader
          query={logQuery}
          repo={appName}
        />
      </PageTitle>
      <Input
        marginBottom="large"
        placeholder="Filter logs"
        startIcon={(<SearchIcon size={14} />)}
        value={search}
        onChange={({ target: { value } }) => setSearch(value)}
      />
      <LogsLabels
        labels={labelList}
        removeLabel={removeLabel}
      />
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
        height={800}
      >
        <LogFilters
          namespace={appName}
          setSearch={setSearch}
          setLabels={setLabels}
          labels={labels}
          search={search}
        />
        <Logss
          application={currentApp}
          query={logQuery}
        />
      </Card>
    </LabelContext.Provider>
  )
}
