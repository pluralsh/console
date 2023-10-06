import { type Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useComponentKindSelect } from './Components'
import { ComponentList } from './ComponentList'

export default function AppComponents() {
  const { appName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === appName)

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'components', url: `/apps/${appName}/components` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

  const { kindSelector, selectedKinds } = useComponentKindSelect(
    currentApp?.status?.components
  )

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={kindSelector}
    >
      <ComponentList
        setUrl={(c) =>
          c?.kind && c?.name
            ? `/apps/${appName}/components/${c.kind.toLowerCase()}/${c.name}`
            : undefined
        }
        components={currentApp?.status?.components}
        selectedKinds={selectedKinds}
      />
    </ScrollablePage>
  )
}
