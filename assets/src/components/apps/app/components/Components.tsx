import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import { Component } from './Application'

export default function Components() {
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Components" />
      {currentApp.status.components.map(component => (
        <Component
          key={`${component.group}:${component.name}`}
          component={component}
        />
      ))}
    </>
  )
}
