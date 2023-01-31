import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { A, Div, Flex } from 'honorable'
import {
  AppsIcon,
  Button,
  Chip,
  DiscordIcon,
  EmptyState,
  Input,
  LifePreserverIcon,
  LoopingLogo,
  MagnifyingGlassIcon,
  SourcererIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Fuse from 'fuse.js'

import { Readiness, readinessToLabel } from 'utils/status'

import { isEmpty } from 'lodash'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import App from './AppCard'
import { appState } from './misc'

const ALL_FILTER = 'All'

const FILTERS = [
  { key: ALL_FILTER, label: 'All', color: 'neutral' },
  {
    key: Readiness.Ready,
    label: readinessToLabel[Readiness.Ready],
    color: 'success',
  },
  {
    key: Readiness.InProgress,
    label: readinessToLabel[Readiness.InProgress],
    color: 'warning',
  },
  {
    key: Readiness.Failed,
    label: readinessToLabel[Readiness.Failed],
    color: 'error',
  },
]

function QueryEmptyState({ query, setQuery }) {
  return (
    <EmptyState
      icon={<AppsIcon size={64} />}
      message="No apps found."
      description={`"${query}" did not match any of your installed applications.`}
      width={600}
    >
      <Button
        secondary
        onClick={() => setQuery('')}
        marginTop="medium"
        fontWeight={600}
      >
        Reset filter
      </Button>
    </EmptyState>
  )
}

function ReadyEmptyState() {
  return (
    <EmptyState
      icon={<LifePreserverIcon size={64} />}
      message="That's awkward."
      description="None of yout apps appear to be ready. Don't worry — we're here to help."
      width={400}
    >
      <Button
        as="a"
        href="https://discord.gg/bEBAMXV64s"
        target="_blank"
        rel="noopener noreferrer"
        marginTop="medium"
        fontWeight={600}
      >
        <DiscordIcon paddingRight="small" />
        Ping us on Discord
      </Button>
    </EmptyState>
  )
}

function PendingFailedEmptyState({ filter }) {
  return (
    <EmptyState
      icon={(
        <SourcererIcon
          width={64}
          height={100}
        />
      )}
      message="Woah."
      description={
        (
          <>
            <Div>
              There are no{' '}
              {FILTERS.find(f => f.key === filter)?.label.toLowerCase()} apps.
            </Div>
            <Div>
              You may be ready to become an&nbsp;
              <A
                inline
                href="https://www.plural.sh/community"
                target="_blank"
                rel="noopener noreferrer"
              >
                open-sourcerer
              </A>
              .
            </Div>
          </>
        ) as any // Workaround as JSX elements are not allowed here.
      }
      width={500}
    />
  )
}

const searchOptions = {
  keys: ['name'],
  threshold: 0.25,
}

export default function Apps() {
  const { applications = [] } = useContext<any>(InstallationContext)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const [query, setQuery] = useState<string>('')
  const [filter, setFilter] = useState<any>(ALL_FILTER)
  const tabStateRef = useRef<any>(null)

  useEffect(() => setBreadcrumbs([{ text: 'apps', url: '/' }]),
    [setBreadcrumbs])

  const handleFilter = useCallback(f => applications.filter(app => !f || appState(app).readiness === f),
    [applications])

  const appsByState = useMemo(() => ({
    [ALL_FILTER]: applications,
    [Readiness.Ready]: handleFilter(Readiness.Ready),
    [Readiness.InProgress]: handleFilter(Readiness.InProgress),
    [Readiness.Failed]: handleFilter(Readiness.Failed),
  }),
  [applications, handleFilter])

  const filteredApps = useMemo(() => {
    const filteredByState = appsByState[filter]

    const fuse = new Fuse(filteredByState, searchOptions)
    const filteredByQuery = query
      ? fuse.search(query).map(({ item }) => item)
      : filteredByState

    return filteredByQuery
  }, [appsByState, filter, query])
  const noFilteredApps = filteredApps?.length < 1

  if (isEmpty(applications)) return <LoopingLogo />

  return (
    <ResponsivePageFullWidth
      heading="Apps"
      headingContent={(
        <>
          <Flex grow={1} />
          <TabList
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: filter,
              onSelectionChange: setFilter,
            }}
          >
            {FILTERS.map(({ label, key, color }) => {
              const appCount = appsByState[key]?.length

              return (
                <SubTab
                  key={key}
                  textValue={label}
                >
                  <Flex align="center">
                    {label}
                    {!!appCount && (
                      <Chip
                        marginLeft="xsmall"
                        size="small"
                        severity={color}
                      >
                        {appCount}
                      </Chip>
                    )}
                  </Flex>
                </SubTab>
              )
            })}
          </TabList>
          <Input
            placeholder="Filter applications"
            startIcon={<MagnifyingGlassIcon size={14} />}
            value={query}
            onChange={event => setQuery(event.target.value)}
            width={320}
          />
        </>
      )}
    >
      {!noFilteredApps ? (
        <Div
          display="grid"
          gap="large"
          gridTemplateColumns="repeat(auto-fit, minmax(500px, 1fr))"
        >
          {!noFilteredApps
            && filteredApps.map(app => (
              <App
                key={app.name}
                app={app}
              />
            ))}
        </Div>
      ) : (
        <Flex
          justifyContent="center"
          alignItems="center"
          minHeight="100%"
          overflow="auto"
        >
          {query && (
            <QueryEmptyState
              query={query}
              setQuery={setQuery}
            />
          )}
          {!query && filter === Readiness.Ready && <ReadyEmptyState />}
          {!query
            && [Readiness.InProgress, Readiness.Failed].includes(filter) && (
            <PendingFailedEmptyState filter={filter} />
          )}
        </Flex>
      )}
    </ResponsivePageFullWidth>
  )
}
