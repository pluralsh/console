import { useOutletContext } from 'react-router-dom'
import { useMemo, type JSX } from 'react'

import styled, { useTheme } from 'styled-components'

import Pods from './info/Pods'
import Job from './info/Job'
import CronJob from './info/CronJob'
import Certificate from './info/Certificate'
import Service from './info/Service'
import Ingress from './info/Ingress'
import Deployment from './info/Deployment'
import StatefulSet from './info/StatefulSet'
import { ComponentDetailsContext } from './ComponentDetails'
import DaemonSet from './info/Daemonset'
import CanaryInfo from './info/Canary'
import PluralServiceDeployment from './info/PluralServiceDeployment'
import { Rollout } from './info/rollout/Rollout'

const componentsWithPods: string[] = [
  'deployment',
  'job',
  'service',
  'statefulset',
  'daemonset',
  'rollout',
]

export const componentsWithLogs: string[] = ['deployment', 'statefulset']

function hasPods(kind: string): boolean {
  return componentsWithPods.includes(kind)
}

const componentInfoMap: { [key: string]: JSX.Element } = {
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

export function isUnstructured(kind: string): boolean {
  return componentInfoMap[kind.toLowerCase()] === undefined
}

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
        gap: theme.spacing.xlarge,
        paddingBottom: theme.spacing.xxlarge,
      }}
    >
      {hasPods(componentKind) && <Pods pods={value?.pods} />}
      {info && value && <InfoWrapperSC>{info}</InfoWrapperSC>}
    </div>
  )
}

const InfoWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xlarge,
}))
