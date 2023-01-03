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

  const raw = data[componentKind]?.raw
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
