import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { formatLocalizedDateTime } from 'utils/datetime'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  CommonEvent,
  CommonEventList,
  PodPod,
  PodPodList,
  ReplicasetReplicaSet,
  ReplicasetReplicaSetList,
} from '../../../generated/kubernetes'
import {
  getDeploymentEventsInfiniteOptions,
  getDeploymentNewReplicaSetOptions,
  getDeploymentOldReplicaSetsInfiniteOptions,
  getDeploymentOptions,
  getReplicaSetPodsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  DEPLOYMENTS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { SubTitle } from '../../utils/SubTitle'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import Annotations from '../common/Annotations'
import HorizontalPodAutoscalersForResource from '../common/HorizontalPodAutoscalers'
import { LabelSelector } from '../common/LabelSelector'
import { PodInfo } from '../common/PodInfo'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import ResourceInfoCard, {
  ResourceInfoCardEntry,
  ResourceInfoCardSection,
} from '../common/ResourceInfoCard'
import ResourceLink from '../common/ResourceLink'
import { ResourceList } from '../common/ResourceList.tsx'
import { fromResource, Kind, Resource } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './Deployments'
import { useReplicaSetsColumns } from './ReplicaSets'
import { WorkloadStatusChip } from './utils'
import { usePodsColumns } from './Pods.tsx'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'replicasets', label: 'Replica Sets' },
  { path: 'hpas', label: 'Horizontal Pod Autoscalers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Deployment(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: deployment,
    isLoading,
    error,
  } = useQuery({
    ...getDeploymentOptions({
      client: AxiosInstance(clusterId),
      path: { deployment: name, namespace },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getWorkloadsAbsPath(
            clusterId
          )}/${DEPLOYMENTS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.Deployment,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (isLoading) {
    return <LoadingIndicator />
  }

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={deployment}>
          <SidecarItem heading="Status">
            <WorkloadStatusChip podInfo={deployment?.pods} />
          </SidecarItem>
          <SidecarItem heading="Pods">
            <PodInfo info={deployment?.pods} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(deployment?.containerImages ?? []).concat(
                deployment?.initContainerImages ?? []
              )}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Selector">
            <LabelSelector selector={{ matchLabels: deployment?.selector }} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={deployment} />
    </ResourceDetails>
  )
}

export function DeploymentPods(): ReactElement<any> {
  const { name = '', namespace = '', clusterId = '' } = useParams()
  const columns = usePodsColumns()

  const { data: replicaSet, isLoading } = useQuery({
    ...getDeploymentNewReplicaSetOptions({
      client: AxiosInstance(clusterId),
      path: { deployment: name, namespace },
    }),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getReplicaSetPodsInfiniteOptions}
      pathParams={{
        replicaSet: replicaSet?.objectMeta?.name,
        namespace: replicaSet?.objectMeta?.namespace,
      }}
      itemsKey="pods"
    />
  )
}

export function DeploymentReplicaSets(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useReplicaSetsColumns()

  return (
    <>
      <section>
        <SubTitle>New Replica Set</SubTitle>
        <NewReplicaSet />
      </section>
      <section>
        <SubTitle>Old Replica Sets</SubTitle>
        <ResourceList<ReplicasetReplicaSetList, ReplicasetReplicaSet>
          namespaced
          columns={columns}
          queryOptions={getDeploymentOldReplicaSetsInfiniteOptions}
          pathParams={{ deployment: name, namespace }}
          itemsKey="replicaSets"
        />
      </section>
    </>
  )
}

function NewReplicaSet(): ReactElement<any> {
  const { name = '', namespace = '', clusterId = '' } = useParams()

  const { data: replicaSet, isLoading } = useQuery({
    ...getDeploymentNewReplicaSetOptions({
      client: AxiosInstance(clusterId),
      path: { deployment: name, namespace },
    }),
    refetchInterval: 30_000,
  })

  return (
    <ResourceInfoCard loading={isLoading}>
      <ResourceInfoCardSection>
        <ResourceInfoCardEntry heading="Name">
          <ResourceLink
            objectRef={fromResource(replicaSet as Resource)}
            short
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Namespace">
          <ResourceLink
            objectRef={{
              kind: Kind.Namespace,
              name: replicaSet?.objectMeta?.namespace,
            }}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Creation date">
          {formatLocalizedDateTime(replicaSet?.objectMeta?.creationTimestamp)}{' '}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Pods">
          <PodInfo info={replicaSet?.podInfo} />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Labels">
          <ChipList
            size="small"
            limit={3}
            values={Object.entries(replicaSet?.objectMeta?.labels || {})}
            transformValue={(label) => label.join(': ')}
            emptyState={<div>-</div>}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Annotations">
          <Annotations annotations={replicaSet?.objectMeta?.annotations} />
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
    </ResourceInfoCard>
  )
}

export function DeploymentHorizontalPodAutoscalers(): ReactElement<any> {
  const { name, namespace } = useParams()

  return (
    <HorizontalPodAutoscalersForResource
      kind={Kind.Deployment}
      namespace={namespace!}
      name={name!}
    />
  )
}

export function DeploymentEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getDeploymentEventsInfiniteOptions}
      pathParams={{ deployment: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
