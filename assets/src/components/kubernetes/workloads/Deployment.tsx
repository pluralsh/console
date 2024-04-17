import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import moment from 'moment/moment'

import {
  DeploymentEventsQuery,
  DeploymentEventsQueryVariables,
  DeploymentNewReplicaSetQueryVariables,
  DeploymentOldReplicaSetsQuery,
  DeploymentOldReplicaSetsQueryVariables,
  DeploymentQueryVariables,
  Deployment_DeploymentDetail as DeploymentT,
  Common_EventList as EventListT,
  Common_Event as EventT,
  V1_LabelSelector as LabelSelectorT,
  Common_PodInfo as PodInfoT,
  Replicaset_ReplicaSetList as ReplicaSetListT,
  Replicaset_ReplicaSet as ReplicaSetT,
  useDeploymentEventsQuery,
  useDeploymentNewReplicaSetQuery,
  useDeploymentOldReplicaSetsQuery,
  useDeploymentQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar } from '../common/utils'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import {
  DEPLOYMENTS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { PodInfo } from '../common/PodInfo'
import { SubTitle } from '../../utils/SubTitle'
import { useEventsColumns } from '../cluster/Events'
import { ResourceList } from '../common/ResourceList'
import { LabelSelector } from '../common/LabelSelector'
import ResourceInfoCard, {
  ResourceInfoCardEntry,
  ResourceInfoCardSection,
} from '../common/ResourceInfoCard'
import Annotations from '../common/Annotations'
import { InlineLink } from '../../utils/typography/InlineLink'
import HorizontalPodAutoscalersForResource from '../common/HorizontalPodAutoscalers'
import { useCluster } from '../Cluster'

import { getBreadcrumbs } from './Deployments'
import { useReplicaSetsColumns } from './ReplicaSets'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'replicasets', label: 'Replica Sets' },
  { path: 'hpas', label: 'Horizontal Pod Autoscalers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Deployment(): ReactElement {
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
            'deployment',
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

export function DeploymentReplicaSets(): ReactElement {
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
          query={useDeploymentOldReplicaSetsQuery}
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

function NewReplicaSet(): ReactElement {
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
          <Link
            to={getResourceDetailsAbsPath(
              clusterId,
              replicaSet?.typeMeta?.kind ?? '',
              replicaSet?.objectMeta?.name,
              replicaSet?.objectMeta?.namespace
            )}
          >
            <InlineLink>{replicaSet?.objectMeta?.name}</InlineLink>
          </Link>
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Namespace">
          {replicaSet?.objectMeta?.namespace ?? ''}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Creation date">
          {moment(replicaSet?.objectMeta?.creationTimestamp).format('lll')}{' '}
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

export function DeploymentHorizontalPodAutoscalers(): ReactElement {
  const { name, namespace } = useParams()

  return (
    <HorizontalPodAutoscalersForResource
      kind="deployment"
      namespace={namespace!}
      name={name!}
    />
  )
}

export function DeploymentEvents(): ReactElement {
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
      query={useDeploymentEventsQuery}
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
