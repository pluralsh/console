import { ReactElement } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem } from '@pluralsh/design-system'
import { A } from 'honorable'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  PodQueryVariables,
  Pod_PodDetail as PodT,
  usePodQuery,
} from '../../../generated/graphql-kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import Containers from '../common/Containers'
import Conditions from '../common/Conditions'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar } from '../utils'
import { StatusChip } from '../../cluster/TableElements'
import { ReadinessT } from '../../../utils/status'

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
      sidecar={
        <MetadataSidecar objectMeta={pod.objectMeta}>
          <SidecarItem heading="IP">{pod?.podIP}</SidecarItem>
          <SidecarItem heading="Parent node">
            <A
              as={Link}
              to={`/nodes/${pod?.nodeName}`}
              inline
            >
              {pod?.nodeName}
            </A>
          </SidecarItem>
          <SidecarItem heading="Service account">
            {pod?.serviceAccountName}
          </SidecarItem>
          <SidecarItem heading="Status">
            <StatusChip readiness={pod?.podPhase as ReadinessT} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={pod} />
    </ResourceDetails>
  )
}

export function PodInfo(): ReactElement {
  const pod = useOutletContext() as PodT
  const conditions = pod?.conditions

  return (
    <section>
      <SubTitle>Conditions</SubTitle>
      <Conditions conditions={conditions} />
    </section>
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
