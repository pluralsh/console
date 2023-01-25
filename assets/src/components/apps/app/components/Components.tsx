import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import Component from './Component'

export default function Components() {
  const { appName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find(app => app.name === appName)

  return (
    <>
      <PageTitle heading="Components" />
      <Card
        direction="column"
        paddingRight="xxxsmall"
        overflowY="auto"
      >
        {currentApp.status.components.map((component, i) => (
          <Component
            key={i}
            component={component}
            last={currentApp.status.components.length === i + 1}
          />
        ))}
      </Card>
    </>
  )
}
