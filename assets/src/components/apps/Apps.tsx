import { Readiness, appState } from 'components/Application'
import { InstallationContext } from 'components/Installations'
import { Div, Flex } from 'honorable'
import {
  Input,
  MagnifyingGlassIcon,
  PageTitle,
  SubTab,
  TabList,
} from 'pluralsh-design-system'
import { useContext, useRef, useState } from 'react'

import App from './AppCard'

const FILTERS = [
  { key: '', label: 'All' },
  { key: Readiness.Ready, label: 'Ready' },
  { key: Readiness.Complete, label: 'Complete' },
  { key: Readiness.InProgress, label: 'Pending' },
  { key: Readiness.Failed, label: 'Failed' },
]

export default function Apps() {
  const {
    applications, setCurrentApplication, currentApplication,
  }: any = useContext(InstallationContext)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const tabStateRef = useRef<any>(null)

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
        margin="medium"
        direction="row"
        wrap="wrap"
      >
        {applications
          .filter(app => !query || app.name.startsWith(query)) // TODO: Use better search method.
          .filter(app => !filter || appState(app).readiness === filter) // TODO: Improve performance.
          .map(app => (
            <App
              key={app.name}
              application={app}
              current={currentApplication}
              setCurrentApplication={setCurrentApplication}
            />
          ))}
      </Flex>
    </Div>
  )
}
