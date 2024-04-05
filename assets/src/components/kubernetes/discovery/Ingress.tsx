import React, { ReactElement, useMemo } from 'react'

import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Card,
  ChipList,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { createColumnHelper } from '@tanstack/react-table'

import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  V1_HttpIngressPath as HTTPIngressPathT,
  IngressEventsQuery,
  IngressEventsQueryVariables,
  IngressQueryVariables,
  Ingress_IngressDetail as IngressT,
  useIngressEventsQuery,
  useIngressQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import {
  INGRESSES_REL_PATH,
  getDiscoveryAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { NAMESPACE_PARAM } from '../Kubernetes'

import LoadingIndicator from '../../utils/LoadingIndicator'

import { useEventsColumns } from '../cluster/Events'

import { ResourceList } from '../ResourceList'

import { SubTitle } from '../../utils/SubTitle'

import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'

import { InlineLink } from '../../utils/typography/InlineLink'

import { getBreadcrumbs } from './Ingresses'
import { Endpoints } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Ingress(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useIngressQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as IngressQueryVariables,
  })

  const ingress = data?.handleGetIngressDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getDiscoveryAbsPath(
            cluster?.id
          )}/${INGRESSES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'ingress', name, namespace),
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
        <MetadataSidecar resource={ingress}>
          <SidecarItem heading="Endpoints">
            <Endpoints endpoints={ingress?.endpoints ?? []} />
          </SidecarItem>
          <SidecarItem heading="Hosts">
            <ChipList
              size="small"
              limit={3}
              values={ingress?.hosts ?? []}
              emptyState={<div>None</div>}
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
      const { clusterId, namespace } = useParams()

      return (
        <Link
          to={getResourceDetailsAbsPath(
            clusterId,
            'service',
            getValue() ?? '',
            namespace
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <InlineLink>{getValue()}</InlineLink>
        </Link>
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
      const { clusterId, namespace } = useParams()

      return (
        <Link
          to={getResourceDetailsAbsPath(
            clusterId,
            'secret',
            getValue() ?? '',
            namespace
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <InlineLink>{getValue()}</InlineLink>
        </Link>
      )
    },
  }),
]

export function IngressInfo(): ReactElement {
  const theme = useTheme()
  const ingress = useOutletContext() as IngressT
  const backend = ingress.spec.defaultBackend

  const tls = useMemo(() => {
    const map = new Map<string, string | undefined>()

    ingress.spec.tls?.forEach(
      (spec) =>
        spec?.hosts?.forEach((host) => {
          if (host) map.set(host, spec.secretName ?? undefined)
        })
    )

    return map
  }, [ingress.spec.tls])

  const rules = useMemo(
    () =>
      (ingress.spec.rules ?? [])
        .map(
          (rule) =>
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

export function IngressEvents(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      IngressEventsQuery,
      IngressEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useIngressEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as IngressEventsQueryVariables,
      }}
      queryName="handleGetIngressEvent"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
