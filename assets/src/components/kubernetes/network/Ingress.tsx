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
  V1HttpIngressPath as HTTPIngressPathT,
  IngressIngressDetail,
} from '../../../generated/kubernetes'
import {
  getIngressEventsInfiniteOptions,
  getIngressOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  getNetworkAbsPath,
  getResourceDetailsAbsPath,
  INGRESSES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { SubTitle } from '../../utils/SubTitle'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'
import ResourceLink from '../common/ResourceLink'
import { ResourceList } from '../common/ResourceList.tsx'
import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './Ingresses'
import { Endpoints } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Ingress(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: ingress,
    isFetching,
    error,
  } = useQuery({
    ...getIngressOptions({
      client: AxiosInstance(clusterId),
      path: { name, namespace },
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
          )}/${INGRESSES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.Ingress,
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
        <MetadataSidecar resource={ingress}>
          <SidecarItem heading="Endpoints">
            <Endpoints endpoints={ingress?.endpoints ?? []} />
          </SidecarItem>
          <SidecarItem heading="Hosts">
            <ChipList
              size="small"
              limit={3}
              values={ingress?.hosts ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Ingress class name">
            {ingress?.spec.ingressClassName}
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={ingress} />
    </ResourceDetails>
  )
}

type IngressRuleFlatT = {
  host?: string
  path: HTTPIngressPathT
  tlsSecretName?: string
}

const columnHelper = createColumnHelper<IngressRuleFlatT>()

const columns = [
  columnHelper.accessor((rule) => rule?.host, {
    id: 'host',
    header: 'Host',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((rule) => rule?.path.path, {
    id: 'path',
    header: 'Path',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((rule) => rule?.path.pathType, {
    id: 'pathType',
    header: 'Path type',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((rule) => rule?.path.backend.service?.name, {
    id: 'service',
    header: 'Service',
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { namespace } = useParams()

      return (
        <ResourceLink
          short
          objectRef={{
            kind: Kind.Service,
            name: getValue(),
            namespace,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }),
  columnHelper.accessor((rule) => rule?.path.backend.service?.port, {
    id: 'servicePort',
    header: 'Service port',
    cell: ({ getValue }) => Object.values(getValue() ?? {}).join(' '),
  }),
  columnHelper.accessor((rule) => rule?.tlsSecretName, {
    id: 'tleSecret',
    header: 'TLS secret',
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { namespace } = useParams()

      return (
        <ResourceLink
          short
          objectRef={{
            kind: Kind.Secret,
            name: getValue(),
            namespace,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }),
]

export function IngressInfo(): ReactElement<any> {
  const theme = useTheme()
  const ingress = useOutletContext() as IngressIngressDetail
  const backend = ingress.spec.defaultBackend

  const tls = useMemo(() => {
    const map = new Map<string, string | undefined>()

    ingress.spec.tls?.forEach((spec) =>
      spec?.hosts?.forEach((host) => {
        if (host) map.set(host, spec.secretName ?? undefined)
      })
    )

    return map
  }, [ingress.spec.tls])

  const rules = useMemo(
    () =>
      (ingress.spec.rules ?? [])
        .map((rule) =>
          rule?.http?.paths.map(
            (specPath) =>
              ({
                host: rule.host || '',
                path: specPath,
                tlsSecretName: rule.host ? tls.get(rule.host) || '' : '',
              }) as IngressRuleFlatT
          )
        )
        .flat(),
    [ingress.spec.rules, tls]
  )

  return (
    <>
      {backend && (
        <section>
          <SubTitle>Default backend</SubTitle>
          <Card
            css={{
              display: 'flex',
              gap: theme.spacing.large,
              padding: theme.spacing.medium,
              flexWrap: 'wrap',
            }}
          >
            {backend.service && (
              <ResourceInfoCardEntry heading="Service name">
                {backend.service.name}
              </ResourceInfoCardEntry>
            )}
            {backend.service?.port && (
              <ResourceInfoCardEntry heading="Service port name">
                {backend.service.port.name}
              </ResourceInfoCardEntry>
            )}
            {backend.service?.port?.number && (
              <ResourceInfoCardEntry heading="Service port number">
                {backend.service.port.number}
              </ResourceInfoCardEntry>
            )}
            {backend.resource && (
              <ResourceInfoCardEntry heading={backend.resource.kind}>
                {backend.resource.name}
              </ResourceInfoCardEntry>
            )}
          </Card>
        </section>
      )}
      <section>
        <SubTitle>Rules</SubTitle>
        <Table
          data={rules ?? []}
          columns={columns}
          css={{
            maxHeight: '500px',
            height: '100%',
          }}
        />
      </section>
    </>
  )
}

export function IngressEvents(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getIngressEventsInfiniteOptions}
      pathParams={{ name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
