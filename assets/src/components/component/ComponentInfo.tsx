import { useMemo, type JSX } from 'react'
import { useOutletContext } from 'react-router-dom'

import styled, { useTheme } from 'styled-components'

import { ComponentDetailsContext } from './ComponentDetails'
import CanaryInfo from './info/Canary'
import Certificate from './info/Certificate'
import CronJob from './info/CronJob'
import DaemonSet from './info/Daemonset'
import Deployment from './info/Deployment'
import Ingress from './info/Ingress'
import Job from './info/Job'
import PluralServiceDeployment from './info/PluralServiceDeployment'
import Pods from './info/Pods'
import { Rollout } from './info/rollout/Rollout'
import Service from './info/Service'
import StatefulSet from './info/StatefulSet'
import {
  ComponentDetailsWithPodsT,
  StructuredComponentKind,
} from './useFetchComponentDetails'

const componentsWithPods: StructuredComponentKind[] = [
  'deployment',
  'job',
  'service',
  'statefulset',
  'daemonset',
  'rollout',
]

export const componentsWithLogs: StructuredComponentKind[] = [
  'deployment',
  'statefulset',
]

function hasPods(kind: string): boolean {
  return componentsWithPods.includes(kind as StructuredComponentKind)
}

const componentInfoMap: Record<StructuredComponentKind, JSX.Element> = {
  certificate: <Certificate />,
  cronjob: <CronJob />,
  deployment: <Deployment />,
  ingress: <Ingress />,
  job: <Job />,
  service: <Service />,
  statefulset: <StatefulSet />,
  daemonset: <DaemonSet />,
  canary: <CanaryInfo />,
  servicedeployment: <PluralServiceDeployment />,
  rollout: <Rollout />,
}

function getInfo(kind: string): JSX.Element | undefined {
  return componentInfoMap[kind]
}

export default function ComponentInfo() {
  const theme = useTheme()
  const {
    componentDetails,
    component: { kind },
  } = useOutletContext<ComponentDetailsContext>()
  const componentKind = kind.toLowerCase()
  const info = useMemo(() => getInfo(componentKind), [componentKind])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xlarge,
        paddingBottom: theme.spacing.xxlarge,
      }}
    >
      {hasPods(componentKind) && (
        <Pods
          pods={(componentDetails as ComponentDetailsWithPodsT)?.pods ?? []}
        />
      )}
      {info && componentDetails && <InfoWrapperSC>{info}</InfoWrapperSC>}
    </div>
  )
}

const InfoWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xlarge,
}))
