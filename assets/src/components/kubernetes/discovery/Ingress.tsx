import React, { ReactElement, useMemo } from 'react'

import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Card,
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import {
  Common_EventList as EventListT,
  Common_Event as EventT,
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

export function IngressInfo(): ReactElement {
  const theme = useTheme()
  const ingress = useOutletContext() as IngressT
  const backend = ingress.spec.defaultBackend

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
        {JSON.stringify(ingress.spec.rules)}
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
