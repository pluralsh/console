import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { formatLocalizedDateTime } from 'utils/datetime'

import {
  Common_Event as EventT,
  Common_EventList as EventListT,
  Common_PodInfo as PodInfoT,
  Deployment_DeploymentDetail as DeploymentT,
  DeploymentEventsDocument,
  DeploymentEventsQuery,
  DeploymentEventsQueryVariables,
  DeploymentNewReplicaSetQueryVariables,
  DeploymentOldReplicaSetsDocument,
  DeploymentOldReplicaSetsQuery,
  DeploymentOldReplicaSetsQueryVariables,
  DeploymentQueryVariables,
  Replicaset_ReplicaSet as ReplicaSetT,
  Replicaset_ReplicaSetList as ReplicaSetListT,
  useDeploymentNewReplicaSetQuery,
  useDeploymentQuery,
  V1_LabelSelector as LabelSelectorT,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  DEPLOYMENTS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
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
import { ResourceList } from '../common/ResourceList'
import { fromResource, Kind, Resource } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './Deployments'
import { useReplicaSetsColumns } from './ReplicaSets'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'replicasets', label: 'Replica Sets' },
  { path: 'hpas', label: 'Horizontal Pod Autoscalers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Deployment(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useDeploymentQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as DeploymentQueryVariables,
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

  const deployment = data?.handleGetDeploymentDetail as DeploymentT

  if (loading) {
    return <LoadingIndicator />
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
            <LabelSelector
              selector={{ matchLabels: deployment?.selector } as LabelSelectorT}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={deployment} />
    </ResourceDetails>
  )
}

export function DeploymentReplicaSets(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useReplicaSetsColumns()

  return (
    <>
      <section>
        <SubTitle>New Replica Set</SubTitle>
        <NewReplicaSet />
      </section>
      <section>
        <SubTitle>Old Replica Sets</SubTitle>
        <ResourceList<
          ReplicaSetListT,
          ReplicaSetT,
          DeploymentOldReplicaSetsQuery,
          DeploymentOldReplicaSetsQueryVariables
        >
          namespaced
          columns={columns}
          queryDocument={DeploymentOldReplicaSetsDocument}
          queryOptions={{
            variables: {
              namespace,
              name,
            } as DeploymentOldReplicaSetsQueryVariables,
          }}
          queryName="handleGetDeploymentOldReplicaSets"
          itemsKey="replicaSets"
        />
      </section>
    </>
  )
}

function NewReplicaSet(): ReactElement<any> {
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useDeploymentNewReplicaSetQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as DeploymentNewReplicaSetQueryVariables,
  })

  const replicaSet = data?.handleGetDeploymentNewReplicaSet

  return (
    <ResourceInfoCard loading={loading}>
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
          <PodInfo info={replicaSet?.podInfo as PodInfoT} />
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
    <ResourceList<
      EventListT,
      EventT,
      DeploymentEventsQuery,
      DeploymentEventsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={DeploymentEventsDocument}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as DeploymentEventsQueryVariables,
      }}
      queryName="handleGetDeploymentEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
