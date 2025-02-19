import { ReactElement, useMemo } from 'react'
import {
  Card,
  ChipList,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Endpoint_Endpoint as EndpointT,
  Common_EventList as EventListT,
  Common_Event as EventT,
  Ingress_IngressList as IngressListT,
  Ingress_Ingress as IngressT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  ServiceEventsQuery,
  ServiceEventsQueryVariables,
  ServiceIngressesQuery,
  ServiceIngressesQueryVariables,
  ServicePodsQuery,
  ServicePodsQueryVariables,
  ServiceQueryVariables,
  Service_ServiceDetail as ServiceT,
  useServiceEventsQuery,
  useServiceIngressesQuery,
  useServicePodsQuery,
  useServiceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, ResourceReadyChip } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import {
  SERVICES_REL_PATH,
  getNetworkAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { usePodsColumns } from '../workloads/Pods'
import { ResourceList } from '../common/ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { SubTitle } from '../../utils/SubTitle'

import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './Services'
import { Endpoints, serviceTypeDisplayName } from './utils'
import { useIngressesColumns } from './Ingresses'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'ingresses', label: 'Ingresses' },
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Service(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useServiceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as ServiceQueryVariables,
  })

  const service = data?.handleGetServiceDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getNetworkAbsPath(
            cluster?.id
          )}/${SERVICES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.Service,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={service}>
          <SidecarItem heading="Type">
            {serviceTypeDisplayName[service?.type.toLowerCase() ?? ''] ??
              service?.type}
          </SidecarItem>
          <SidecarItem heading="Cluster IP">{service?.clusterIP}</SidecarItem>
          <SidecarItem heading="Session affinity">
            {service?.sessionAffinity}
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={service} />
    </ResourceDetails>
  )
}

const columnHelper = createColumnHelper<EndpointT>()

const columns = [
  columnHelper.accessor((endpoint) => endpoint?.host, {
    id: 'host',
    header: 'Host',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((endpoint) => endpoint?.ports, {
    id: 'ports',
    header: 'Ports',
    cell: ({ getValue }) =>
      getValue()?.map((port, i) => (
        <div key={i}>
          {port?.name} {port?.port} {port?.protocol} {port?.appProtocol}
        </div>
      )),
  }),
  columnHelper.accessor((endpoint) => endpoint?.nodeName, {
    id: 'node',
    header: 'Node',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((endpoint) => endpoint?.ready, {
    id: 'ready',
    header: 'Ready',
    cell: ({ getValue }) => <ResourceReadyChip ready={getValue()} />,
  }),
]

export function ServiceInfo(): ReactElement<any> {
  const theme = useTheme()
  const service = useOutletContext() as ServiceT

  return (
    <>
      <section>
        <SubTitle>Service information</SubTitle>
        <Card
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            padding: theme.spacing.medium,
            flexWrap: 'wrap',
          }}
        >
          <ResourceInfoCardEntry heading="Internal endpoints">
            <Endpoints endpoints={[service.internalEndpoint]} />
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="External endpoints">
            <Endpoints endpoints={service.externalEndpoints} />
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Selector">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(service.selector || {})}
              transformValue={(label) => label.join(': ')}
              emptyState={<div>-</div>}
            />
          </ResourceInfoCardEntry>
        </Card>
      </section>
      <section>
        <SubTitle>Endpoints</SubTitle>
        <Table
          data={service.endpointList.endpoints}
          columns={columns}
          maxHeight={500}
          height="100%"
        />
      </section>
    </>
  )
}

export function ServiceIngresses(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useIngressesColumns()

  return (
    <ResourceList<
      IngressListT,
      IngressT,
      ServiceIngressesQuery,
      ServiceIngressesQueryVariables
    >
      namespaced
      columns={columns}
      query={useServiceIngressesQuery}
      queryOptions={{
        variables: { namespace, name } as ServiceIngressesQueryVariables,
      }}
      queryName="handleGetServiceIngressList"
      itemsKey="items"
    />
  )
}

export function ServicePods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<PodListT, PodT, ServicePodsQuery, ServicePodsQueryVariables>
      namespaced
      columns={columns}
      query={useServicePodsQuery}
      queryOptions={{
        variables: { namespace, name } as ServicePodsQueryVariables,
      }}
      queryName="handleGetServicePods"
      itemsKey="pods"
    />
  )
}

export function ServiceEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      ServiceEventsQuery,
      ServiceEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useServiceEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ServiceEventsQueryVariables,
      }}
      queryName="handleGetServiceEvent"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
