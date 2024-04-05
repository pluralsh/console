import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

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
import { SubTitle } from '../../utils/SubTitle'
import Containers from '../common/Containers'
import Conditions from '../common/Conditions'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { StatusChip } from '../../cluster/TableElements'
import { ReadinessT } from '../../../utils/status'
import { ResourceList } from '../ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { usePersistentVolumeClaimListColumns } from '../storage/PersistentVolumeClaims'
import {
  PODS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'
import ResourceOwner from '../common/ResourceOwner'
import { NAMESPACE_PARAM } from '../Kubernetes'

import { getBreadcrumbs } from './Pods'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'containers', label: 'Containers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export function Pod(): ReactElement {
  const cluster = useKubernetesCluster()
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

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getWorkloadsAbsPath(
            clusterId
          )}/${PODS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'pod', name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const pod = data?.handleGetPodDetail as PodT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={pod}>
          <SidecarItem heading="IP">{pod?.podIP}</SidecarItem>
          <SidecarItem heading="Parent node">
            <Link
              to={getResourceDetailsAbsPath(clusterId, 'node', pod?.nodeName)}
            >
              <InlineLink>{pod?.nodeName}</InlineLink>
            </Link>
          </SidecarItem>
          <SidecarItem heading="Service account">
            <Link
              to={getResourceDetailsAbsPath(
                clusterId,
                'serviceaccount',
                pod?.serviceAccountName,
                pod?.objectMeta?.namespace
              )}
            >
              <InlineLink>{pod?.serviceAccountName}</InlineLink>
            </Link>
          </SidecarItem>
          <SidecarItem heading="Restart Count">
            {`${pod?.restartCount ?? 0}`}
          </SidecarItem>
          <SidecarItem heading="QOS Class">{pod?.qosClass}</SidecarItem>
          <SidecarItem heading="Status">
            <StatusChip readiness={pod?.podPhase as ReadinessT} />
          </SidecarItem>
          <SidecarItem heading="Pod Phase">{pod?.podPhase}</SidecarItem>
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
  // TODO: handle pull secrets
  // const imagePullSecrets = pod?.imagePullSecrets
  const pvcListColumns = usePersistentVolumeClaimListColumns()

  return (
    <>
      <section>
        <SubTitle>Owner</SubTitle>
        <ResourceOwner
          clusterId={cluster?.id}
          owner={pod?.controller}
        />
      </section>
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
  const columns = useEventsColumns()

  return (
    <ResourceList<EventListT, EventT, PodEventsQuery, PodEventsQueryVariables>
      namespaced
      columns={columns}
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
