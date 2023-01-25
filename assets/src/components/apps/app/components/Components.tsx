import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import { BreadcrumbsContext } from 'components/Breadcrumbs'

import Component from './Component'

export default function Components() {
  const { appName } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'cost analysis', url: `/apps/${appName}/cost` },
  ]), [appName, setBreadcrumbs])

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
