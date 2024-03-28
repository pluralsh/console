import { ReactElement } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem, Table } from '@pluralsh/design-system'
import { A } from 'honorable'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  PodEventsQuery,
  PodEventsQueryVariables,
  PodQueryVariables,
  Pod_PodDetail as PodT,
  usePodEventsQuery,
  usePodQuery,
} from '../../../generated/graphql-kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import Containers from '../common/Containers'
import Conditions from '../common/Conditions'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { StatusChip } from '../../cluster/TableElements'
import { ReadinessT } from '../../../utils/status'
import { ResourceList } from '../ResourceList'
import { COLUMNS } from '../cluster/Events'
import { usePersistentVolumeClaimListColumns } from '../storage/PersistentVolumeClaims'
import ResourceInfoCard, {
  ResourceInfoCardEntry,
  ResourceInfoCardSection,
} from '../common/ResourceInfoCard'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'

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
  const cluster = useKubernetesCluster()
  const pod = useOutletContext() as PodT
  const conditions = pod?.conditions
  const pvcList = pod?.persistentVolumeClaimList
  const imagePullSecrets = pod?.imagePullSecrets
  const pvcListColumns = usePersistentVolumeClaimListColumns()

  return (
    <>
      <ResourceInfoCard title={pod?.objectMeta?.name ?? 'Info'}>
        <ResourceInfoCardSection>
          <ResourceInfoCardEntry heading="Image Pull Secrets">
            {imagePullSecrets &&
              imagePullSecrets.map((secret) => <div>{secret?.name}</div>)}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Pod IP">
            {pod?.podIP}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Pod Phase">
            {pod?.podPhase}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="QOS Class">
            {pod?.qosClass}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Node Name">
            <Link
              to={getResourceDetailsAbsPath(cluster?.id, 'node', pod?.nodeName)}
            >
              <InlineLink>{pod?.nodeName}</InlineLink>
            </Link>
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Restart Count">
            {`${pod?.restartCount ?? 0}`}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Service Account">
            {pod?.serviceAccountName}
          </ResourceInfoCardEntry>
        </ResourceInfoCardSection>
      </ResourceInfoCard>
      <section>
        <SubTitle>Conditions</SubTitle>
        <Conditions conditions={conditions} />
      </section>
      <section>
        <SubTitle>Persistent Volume Claims</SubTitle>
        <Table
          data={pvcList?.items ?? []}
          columns={pvcListColumns}
          reactTableOptions={{ meta: { cluster } }}
          css={{
            maxHeight: '500px',
            height: '100%',
          }}
          emptyStateProps={{
            message: 'No Persistent Volume Claims found.',
          }}
        />
      </section>
    </>
  )
}

export function PodContainers(): ReactElement {
  const pod = useOutletContext() as PodT

  return (
    <>
      {pod?.initContainers?.length > 0 && (
        <section>
          <SubTitle>Init Containers</SubTitle>
          <Containers containers={pod?.initContainers} />
        </section>
      )}
      <section>
        <SubTitle>Containers</SubTitle>
        <Containers containers={pod?.containers} />
      </section>
    </>
  )
}

export function PodEvents(): ReactElement {
  const { name, namespace } = useParams()

  return (
    <ResourceList<EventListT, EventT, PodEventsQuery, PodEventsQueryVariables>
      namespaced
      columns={COLUMNS}
      query={usePodEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as PodEventsQueryVariables,
      }}
      queryName="handleGetPodEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
