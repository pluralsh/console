import { ReactElement, useMemo, useState } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  FormField,
  ListBoxItem,
  Select,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Key } from '@react-types/shared'

import { useTheme } from 'styled-components'

import { ContainerLogsTable } from 'components/cd/cluster/pod/logs/ContainerLogs'

import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from 'components/cd/cluster/pod/logs/Logs'

import { GqlError } from 'components/utils/Alert'

import { reverse } from 'lodash'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  PodEventsQuery,
  PodEventsQueryVariables,
  PodQueryVariables,
  Pod_PodDetail as PodT,
  usePodEventsQuery,
  usePodLogsQuery,
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
import ResourceOwner from '../common/ResourceOwner'
import { NAMESPACE_PARAM } from '../Navigation'
import { ContainerStatusT } from '../../cluster/pods/PodsList'
import { ContainerStatuses } from '../../cluster/ContainerStatuses'
import { useCluster } from '../Cluster'
import ImagePullSecrets from '../common/ImagePullSecrets'
import { Kind } from '../common/types'
import ResourceLink from '../common/ResourceLink'

import { getBreadcrumbs } from './Pods'
import { toReadiness } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'containers', label: 'Containers' },
  { path: 'events', label: 'Events' },
  { path: 'logs', label: 'Logs' },
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
          url: getResourceDetailsAbsPath(clusterId, Kind.Pod, name, namespace),
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
            <ResourceLink
              short
              objectRef={{
                kind: Kind.Node,
                name: pod?.nodeName,
              }}
            />
          </SidecarItem>
          <SidecarItem heading="Service account">
            <ResourceLink
              short
              objectRef={{
                kind: Kind.ServiceAccount,
                name: pod?.serviceAccountName,
                namespace: pod?.objectMeta?.namespace,
              }}
            />
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
          <ResourceOwner owner={pod?.controller} />
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

export function PodLogs(): ReactElement {
  const { name, namespace, clusterId } = useParams()
  const pod = useOutletContext() as PodT
  const theme = useTheme()
  const containers: Array<string> = useMemo(
    () => [
      ...(pod.initContainers?.map((c) => c!.name!) ?? []),
      ...(pod.containers?.map((c) => c!.name!) ?? []),
    ],
    [pod]
  )
  const [selected, setSelected] = useState<Key>(containers.at(0) ?? '')

  const { data, loading, refetch, error } = usePodLogsQuery({
    client: KubernetesClient(clusterId ?? ''),
    variables: {
      container: selected as string,
      name: name ?? '',
      namespace: namespace ?? '',
    },
    fetchPolicy: 'no-cache',
  })
  const [sinceSeconds, setSinceSeconds] = useState<Key>(
    SinceSecondsOptions.HalfHour
  )

  if (error)
    return (
      <GqlError
        error={error}
        header="Could not load pod logs"
      />
    )

  if (!data) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.large,
          '> *': { width: '100%' },
        }}
      >
        <FormField label="Container">
          <Select
            selectedKey={selected}
            onSelectionChange={(key) => setSelected(key)}
          >
            {containers.map((c) => (
              <ListBoxItem
                key={c}
                label={c}
              />
            ))}
          </Select>
        </FormField>

        <FormField label="Logs since">
          <Select
            selectedKey={`${sinceSeconds}`}
            onSelectionChange={(key) => setSinceSeconds(key)}
          >
            {SinceSecondsSelectOptions.map((opts) => (
              <ListBoxItem
                key={`${opts.key}`}
                label={opts.label}
                selected={opts.key === sinceSeconds}
              />
            ))}
          </Select>
        </FormField>
      </div>
      <ContainerLogsTable
        logs={reverse(
          data?.handleLogs?.logs.map((line) => line?.content || '') || []
        )}
        loading={loading}
        refetch={refetch}
        container={selected as string}
      />
    </div>
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
