import { useOutletContext } from 'react-router-dom'
import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import Pods from './info/Pods'
import Job from './info/Job'
import CronJob from './info/CronJob'
import Certificate from './info/Certificate'
import Service from './info/Service'
import Ingress from './info/Ingress'
import Deployment from './info/Deployment'
import StatefulSet from './info/StatefulSet'
import Metadata from './info/Metadata'
import { ComponentDetailsContext } from './ComponentDetails'
import DaemonSet from './info/Daemonset'
import CanaryInfo from './info/Canary'
import PluralServiceDeployment from './info/PluralServiceDeployment'

const componentsWithPods: string[] = [
  'deployment',
  'job',
  'service',
  'statefulset',
  'daemonset',
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
    case 'daemonset':
      return <DaemonSet />
    case 'canary':
      return <CanaryInfo />
    case 'servicedeployment':
      return <PluralServiceDeployment />
    default:
      return undefined
  }
}

const Section = styled.section((_) => ({
  display: 'flex',
  flexDirection: 'row',
  flexBasis: '50%',
  flexGrow: 1,
}))

export default function ComponentInfo() {
  const theme = useTheme()
  const {
    data,
    component: { kind },
  } = useOutletContext<ComponentDetailsContext>()
  const componentKind = kind.toLowerCase()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )

  const info = useMemo(() => getInfo(componentKind), [componentKind])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      {hasPods(componentKind) && <Pods pods={value?.pods} />}
      <div css={{ display: 'flex', gap: theme.spacing.large }}>
        {info && value && <Section>{info}</Section>}
        <Section>
          <Metadata />
        </Section>
      </div>
    </div>
  )
}
