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
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid creating map between component types and fields of data returned by API
  // we are picking first available value from API object. In the future replacement might be needed.
  const value: any = Object.values(data).find(value => value !== undefined)
  const raw = value?.raw
  const object = JSON.parse(raw)

  return (
    <>
      <PageTitle heading="Raw" />
      <Code
        language="yaml"
        maxHeight="calc(100vh - 244px)"
      >
        {stringify(object)}
      </Code>
    </>
  )
}
