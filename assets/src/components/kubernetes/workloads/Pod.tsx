import { ReactElement } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  PodQueryVariables,
  Pod_PodDetail as PodT,
  usePodQuery,
} from '../../../generated/graphql-kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import { Metadata } from '../utils'
import Containers from '../common/Containers'
import Conditions from '../common/Conditions'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

import PodSidecar from './PodSidecar'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'containers', label: 'Containers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export function Pod(): ReactElement {
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = usePodQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as PodQueryVariables,
  })

  const pod = data?.handleGetPodDetail as PodT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<PodSidecar pod={pod} />}
    >
      <Outlet context={pod} />
    </ResourceDetails>
  )
}

export function PodInfo(): ReactElement {
  const pod = useOutletContext() as PodT
  const conditions = pod?.conditions

  return (
    <>
      <section>
        <SubTitle>Conditions</SubTitle>
        <Conditions conditions={conditions} />
      </section>
      <section>
        <SubTitle>Metadata</SubTitle>
        <Metadata objectMeta={pod?.objectMeta} />
      </section>
    </>
  )
}

export function PodContainers(): ReactElement {
  const pod = useOutletContext() as PodT
  const containers = pod?.containers

  return (
    <section>
      <SubTitle>Containers</SubTitle>
      <Containers containers={containers} />
    </section>
  )
}

export function PodEvents(): ReactElement {
  return <>events</>
}

export function PodRaw(): ReactElement {
  return <>raw</>
}
