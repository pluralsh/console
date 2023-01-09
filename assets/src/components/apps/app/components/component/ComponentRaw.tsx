import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Code, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { stringify } from 'yaml'

export default function ComponentRaw() {
  const { appName, componentKind = '', componentName } = useParams()
  const { data } = useOutletContext<any>()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
    { text: 'raw', url: `/apps/${appName}/components/${componentKind}/${componentName}/raw` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = Object.values(data).find(value => value !== undefined)

  return (
    <>
      <PageTitle heading="Raw" />
      <Code
        language="yaml"
        maxHeight="calc(100vh - 244px)"
      >
        {stringify(JSON.parse(value?.raw))}
      </Code>
    </>
  )
}
