import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { Flex } from 'honorable'

export default function ComponentEvents() {
  const { appName, componentKind, componentName } = useParams()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Events" />
      <Flex
        gap="small"
        wrap="wrap"
      >
        {appName}
        {componentKind}
        {componentName}
      </Flex>
    </>
  )
}
