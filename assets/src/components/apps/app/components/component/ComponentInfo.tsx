import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { Flex } from 'honorable'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import Metadata from './info/Metadata'
import Pods from './info/Pods'
import Job from './info/Job'
import CronJob from './info/CronJob'
import Certificate from './info/Certificate'
import Service from './info/Service'
import Ingress from './info/Ingress'
import Deployment from './info/Deployment'
import StatefulSet from './info/StatefulSet'

const componentsWithPods: string[] = ['deployment', 'job', 'service', 'statefulset']

function hasPods(kind: string): boolean {
  return componentsWithPods.includes(kind)
}

function getInfo(kind: string): JSX.Element | undefined {
  switch (kind) {
  case 'certificate':
    return <Certificate />
  case 'cronjob':
    return <CronJob />
  case 'deployment':
    return <Deployment />
  case 'ingress':
    return <Ingress />
  case 'job':
    return <Job />
  case 'service':
    return <Service />
  case 'statefulset':
    return <StatefulSet />
  default:
    return undefined
  }
}

export default function ComponentInfo() {
  const { appName, componentKind = '', componentName } = useParams()
  const { component, data } = useOutletContext<any>()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
    { text: 'Info', url: `/apps/${appName}/components/${componentKind}/${componentName}/info` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = Object.values(data).find(value => value !== undefined)

  return (
    <ScrollablePage heading="Info">
      <Flex
        direction="column"
        gap="large"
      >
        {hasPods(componentKind) && <Pods pods={value?.pods} />}
        {getInfo(componentKind)}
        <Metadata
          component={component}
          metadata={value?.metadata}
        />
      </Flex>
    </ScrollablePage>
  )
}
