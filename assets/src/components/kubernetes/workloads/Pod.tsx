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
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { MetadataSidecar } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { usePersistentVolumeClaimListColumns } from '../storage/PersistentVolumeClaims'
import {
  PODS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'
import ResourceOwner from '../common/ResourceOwner'
import { NAMESPACE_PARAM } from '../Navigation'
import { ContainerStatusT } from '../../cluster/pods/PodsList'
import { ContainerStatuses } from '../../cluster/ContainerStatuses'
import { useCluster } from '../Cluster'
import ImagePullSecrets from '../common/ImagePullSecrets'

import { getBreadcrumbs } from './Pods'
import { toReadiness } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'containers', label: 'Containers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export function Pod(): ReactElement {
  const cluster = useCluster()
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
          <SidecarItem heading="Containers">
            <ContainerStatuses
              statuses={
                pod?.initContainers?.concat(pod?.containers)?.map(
                  (c) =>
                    ({
                      name: c?.name,
                      readiness: toReadiness(c!.state),
                    }) as ContainerStatusT
                ) ?? []
              }
            />
          </SidecarItem>
          <SidecarItem heading="Phase">{pod?.podPhase}</SidecarItem>
          <SidecarItem heading="Node">
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
          <SidecarItem heading="IP">{pod?.podIP}</SidecarItem>
          <SidecarItem heading="Restart Count">
            {`${pod?.restartCount ?? 0}`}
          </SidecarItem>
          <SidecarItem heading="QOS Class">{pod?.qosClass}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={pod} />
    </ResourceDetails>
  )
}

export function PodInfo(): ReactElement {
  const cluster = useCluster()
  const pod = useOutletContext() as PodT
  const conditions = pod?.conditions
  const pvcList = pod?.persistentVolumeClaimList
  const pvcListColumns = usePersistentVolumeClaimListColumns()

  return (
    <>
      {pod?.controller?.objectMeta?.name && (
        <section>
          <SubTitle>Owner</SubTitle>
          <ResourceOwner
            clusterId={cluster?.id}
            owner={pod?.controller}
          />
        </section>
      )}
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
      <section>
        <SubTitle>Image Pull Secrets</SubTitle>
        <ImagePullSecrets
          imagePullSecrets={
            pod?.imagePullSecrets?.map((ref) => ({
              clusterId: cluster?.id ?? '',
              name: ref?.name ?? '',
              namespace: pod?.objectMeta?.namespace ?? '',
            })) ?? []
          }
          maxHeight="500px"
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
        variables: { namespace, name } as PodEventsQueryVariables,
      }}
      queryName="handleGetPodEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
