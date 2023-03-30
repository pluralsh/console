import { useOutletContext, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { useMemo } from 'react'

import Pods from './info/Pods'
import Job from './info/Job'
import CronJob from './info/CronJob'
import Certificate from './info/Certificate'
import Service from './info/Service'
import Ingress from './info/Ingress'
import Deployment from './info/Deployment'
import StatefulSet from './info/StatefulSet'
import Metadata from './info/Metadata'

const componentsWithPods: string[] = [
  'deployment',
  'job',
  'service',
  'statefulset',
]

export const componentsWithLogs: string[] = ['deployment', 'statefulset']

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
  const { componentKind = '' } = useParams()
  const { data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {hasPods(componentKind) && <Pods pods={value?.pods} />}
      <Flex gap="large">
        <Flex
          direction="row"
          basis="50%"
          grow={1}
        >
          {getInfo(componentKind)}
        </Flex>
        <Flex
          direction="row"
          basis="50%"
          grow={1}
        >
          <Metadata />
        </Flex>
      </Flex>
    </Flex>
  )
}
