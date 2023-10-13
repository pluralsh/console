import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { InstallationContext } from 'components/Installations'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { kindToQuery } from 'components/component/kindToQuery'
import { ComponentDetails } from 'components/component/ComponentDetails'

export default function Component() {
  const { appName, componentKind = '', componentName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === appName)

  const componentQuery = kindToQuery[componentKind]

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'apps', url: '/' },
        { label: appName ?? '', url: `/apps/${appName}` },
        { label: 'components', url: `/apps/${appName}/components` },
        {
          label: componentName ?? '',
          url: `/apps/${appName}/components/${componentKind}/${componentName}`,
        },
      ],
      [appName, componentKind, componentName]
    )
  )

  if (!currentApp) return <LoadingIndicator />

  let component = currentApp.status.components.find(
    ({ name, kind }) =>
      name === componentName && kind.toLowerCase() === componentKind
  )

  component = {
    ...component,
    namespace: component.namespace || appName,
  }

  return (
    <ComponentDetails
      query={componentQuery}
      component={component}
      pathMatchString="/apps/:appName/components/:componentKind/:componentName"
    />
  )
}
