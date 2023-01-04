import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { Flex } from 'honorable'

import ComponentInfoMetadata from './ComponentInfoMetadata'
import ComponentInfoPods from './ComponentInfoPods'

const componentsWithPods = ['deployment', 'service', 'statefulset']

export default function ComponentInfo() {
  const { appName, componentKind = '', componentName } = useParams()
  const { component, data, refetch } = useOutletContext<any>()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = Object.values(data).find(value => value !== undefined)

  return (
    <>
      <PageTitle heading="Info" />
      <Flex
        direction="column"
        gap="large"
      >
        {componentsWithPods.includes(componentKind) && (
          <ComponentInfoPods
            pods={value?.pods}
            namespace={appName}
            refetch={refetch}
          />
        )}
        <ComponentInfoMetadata
          component={component}
          metadata={value?.metadata}
        />
      </Flex>
    </>
  )
}
