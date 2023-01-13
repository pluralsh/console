import { appState } from 'components/Component'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { A, Div, Flex } from 'honorable'
import {
  AppsIcon,
  Button,
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
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { Readiness, readinessToLabel } from 'utils/status'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import App from './AppCard'

const FILTERS = [
  { key: '', label: 'All' },
  { key: Readiness.Ready, label: readinessToLabel[Readiness.Ready] },
  { key: Readiness.InProgress, label: readinessToLabel[Readiness.InProgress] },
  { key: Readiness.Failed, label: readinessToLabel[Readiness.Failed] },
]

function QueryEmptyState({ query, setQuery }) {
  return (
    <EmptyState
      icon={<AppsIcon size={64} />}
      message="No apps found."
      description={`"${query}" did not match any of your installed applications.`}
      marginTop={96}
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
      marginTop={96}
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
        <>
          <Div>
            There are no {FILTERS.find(f => f.key === filter)?.label.toLowerCase()} apps.
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
        </> as any // Workaround as JSX elements are not allowed here.
      }
      marginTop={96}
      width={500}
    />
  )
}

export default function Apps() {
  const { applications } = useContext<any>(InstallationContext)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const [query, setQuery] = useState<string>('')
  const [filter, setFilter] = useState<any>('')
  const tabStateRef = useRef<any>(null)

  useEffect(() => {
    setBreadcrumbs([{ text: 'apps', url: '/' }])
  }, [setBreadcrumbs])

  if (!applications) return <LoopingLogo />

  const filteredApps = applications
    .filter(app => !query || app.name.startsWith(query)) // TODO: Use better search method.
    .filter(app => !filter || appState(app).readiness === filter) // TODO: Add cache.
  const noFilteredApps = filteredApps?.length < 1

  return (
    <Flex direction="column">
      <ScrollablePage
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
              {FILTERS.map(({ label, key }) => (
                <SubTab
                  key={key}
                  textValue={label}
                >
                  {label}
                </SubTab>
              ))}
            </TabList>
            <Input
              placeholder="Filter applications"
              startIcon={(<MagnifyingGlassIcon size={14} />)}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </>
        )}
        margin="large"
      >
        <Flex
          justify="center"
          margin="medium"
          padding="xsmall"
          paddingBottom="xxxlarge"
          direction="row"
          wrap="wrap"
          gap="small"
        >
          {!noFilteredApps && filteredApps.map(app => (
            <App
              key={app.name}
              app={app}
            />
          ))}
          {!noFilteredApps && (
            <Flex
              grow={1}
              basis="40%"
            />
          )}
          {noFilteredApps && query && (
            <QueryEmptyState
              query={query}
              setQuery={setQuery}
            />
          )}
          {noFilteredApps && !query && filter === Readiness.Ready && <ReadyEmptyState />}
          {noFilteredApps && !query && ([Readiness.InProgress, Readiness.Failed].includes(filter))
          && <PendingFailedEmptyState filter={filter} />}
        </Flex>
      </ScrollablePage>
    </Flex>
  )
}
