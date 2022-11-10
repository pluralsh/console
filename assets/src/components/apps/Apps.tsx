import { InstallationContext } from 'components/Installations'
import { Div, Flex } from 'honorable'
import { Input, MagnifyingGlassIcon, PageTitle } from 'pluralsh-design-system'
import { useContext, useState } from 'react'

import App from './App'

export default function Apps() {
  const {
    applications, setCurrentApplication, currentApplication,
  }: any = useContext(InstallationContext)
  const [query, setQuery] = useState('')

  return (
    <Div fill>
      <PageTitle
        heading="Apps"
        margin="large"
      >
        <Input
          placeholder="Search an application"
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
          .filter(application => !query || application.name.startsWith(query))
          .map(application => (
            <App
              key={application.name}
              application={application}
              current={currentApplication}
              setCurrentApplication={setCurrentApplication}
            />
          ))}
      </Flex>
    </Div>
  )
}
