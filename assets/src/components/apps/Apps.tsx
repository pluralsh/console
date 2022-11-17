import { Readiness, appState } from 'components/Application'
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
  MagnifyingGlassIcon,
  PageTitle,
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

import App from './AppCard'

const FILTERS = [
  { key: '', label: 'All' },
  { key: Readiness.Ready, label: 'Ready' },
  { key: Readiness.Complete, label: 'Complete' },
  { key: Readiness.InProgress, label: 'Pending' },
  { key: Readiness.Failed, label: 'Failed' },
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
  const { applications, setCurrentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const tabStateRef = useRef<any>(null)
  const filteredApps = applications
    .filter(app => !query || app.name.startsWith(query)) // TODO: Use better search method.
    .filter(app => !filter || appState(app).readiness === filter) // TODO: Add cache.
  const noFilteredApps = filteredApps?.length < 1

  useEffect(() => setBreadcrumbs([{ text: 'Apps', url: '/' }]), [setBreadcrumbs])

  return (
    <Div fill>
      <PageTitle
        heading="Apps"
        margin="large"
      >
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
      </PageTitle>
      <Flex
        justify="center"
        margin="medium"
        paddingBottom="xxxlarge"
        direction="row"
        wrap="wrap"
        // TODO: Set scrolling area to this element.
      >
        {!noFilteredApps && filteredApps.map(app => (
          <App
            key={app.name}
            application={app}
            setCurrentApplication={setCurrentApplication}
          />
        ))}
        {!noFilteredApps && (
          <Flex
            grow={1}
            basis="40%"
            margin="xsmall"
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
    </Div>
  )
}
