import {
  Card,
  ChipList,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  CommonEvent,
  CommonEventList,
  EndpointEndpoint as EndpointT,
  IngressIngress,
  IngressIngressList,
  PodPod,
  PodPodList,
} from '../../../generated/kubernetes'
import {
  getServiceEventsInfiniteOptions,
  getServiceIngressesInfiniteOptions,
  getServiceOptions,
  getServicePodsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  getNetworkAbsPath,
  getResourceDetailsAbsPath,
  SERVICES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../utils/SubTitle'

import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'
import { UpdatedResourceList } from '../common/UpdatedResourceList'

import { Kind } from '../common/types'
import { GqlError } from '../../utils/Alert'
import { MetadataSidecar, ResourceReadyChip } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { usePodsColumns } from '../workloads/Pods'
import { useIngressesColumns } from './Ingresses'

import { getBreadcrumbs } from './Services'
import { Endpoints, serviceTypeDisplayName } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'ingresses', label: 'Ingresses' },
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Service(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: service,
    isFetching,
    error,
  } = useQuery({
    ...getServiceOptions({
      client: AxiosInstance(clusterId),
      path: { service: name, namespace },
    }),
    refetchInterval: 30_000,
  })

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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
    return <LoadingIndicator />
  }

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
  const service = useOutletContext() as any

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
  const { name = '', namespace = '' } = useParams()
  const columns = useIngressesColumns()

  return (
    <UpdatedResourceList<IngressIngressList, IngressIngress>
      namespaced
      columns={columns}
      queryOptions={getServiceIngressesInfiniteOptions}
      pathParams={{ service: name, namespace }}
      itemsKey="items"
    />
  )
}

export function ServicePods(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = usePodsColumns()

  return (
    <UpdatedResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getServicePodsInfiniteOptions}
      pathParams={{ service: name, namespace }}
      itemsKey="pods"
    />
  )
}

export function ServiceEvents(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <UpdatedResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getServiceEventsInfiniteOptions}
      pathParams={{ service: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
