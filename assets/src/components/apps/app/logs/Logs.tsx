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
import { Up } from 'grommet-icons'
import { useQuery } from 'react-apollo'
import { LOGS_Q } from 'components/graphql/dashboards'

import { Flex } from 'honorable'

import LogsLabels from './LogsLabels'
import LogsDownloader from './LogsDownloader'
import LogsFilters from './LogsFilters'
import LogContent from './LogContent'

const POLL_INTERVAL = 10 * 1000
const LIMIT = 1000

const LabelContext = createContext<any>({})

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

export function Logss({ application: { name }, query, addLabel }) {
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
              addLabel={addLabel}
            />
          )}
        </Box>
        <ScrollIndicator
          live={live}
          returnToTop={returnToTop}
        />
      </Stack>
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
    <LabelContext.Provider value={{ labels: labelList }}>
      <PageTitle heading="Logs">
        <Flex
          justify="end"
          gap="medium"
          grow={1}
        >
          <LogsDownloader
            query={logQuery}
            repo={appName}
          />
          <LogsFilters
            namespace={appName}
            setSearch={setSearch}
            setLabels={setLabels}
            labels={labels}
            search={search}
          />
        </Flex>
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
        position="relative"
        height={800}
      >
        <Logss
          application={currentApp}
          query={logQuery}
          addLabel={addLabel}
        />
      </Card>
    </LabelContext.Provider>
  )
}
