import { ReactElement, useMemo } from 'react'
import {
  Code,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  Limitrange_LimitRangeItem as LimitRangeT,
  NamespaceEventsQuery,
  NamespaceEventsQueryVariables,
  NamespaceQueryVariables,
  Namespace_NamespaceDetail as NamespaceT,
  Resourcequota_ResourceQuotaDetail as ResourceQuotaT,
  useNamespaceEventsQuery,
  useNamespaceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { ResourceList } from '../ResourceList'
import { SubTitle } from '../../utils/SubTitle'

import { getBreadcrumbs } from './Namespaces'
import { NamespacePhaseChip } from './utils'
import { useEventsColumns } from './Events'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Namespace(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useNamespaceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as NamespaceQueryVariables,
  })

  const namespace = data?.handleGetNamespaceDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'namespace', name),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={namespace}>
          <SidecarItem heading="Phase">
            <NamespacePhaseChip phase={namespace?.phase} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={namespace} />
    </ResourceDetails>
  )
}

const rqColumnHelper = createColumnHelper<ResourceQuotaT>()

const rqColumns = [
  rqColumnHelper.accessor((rq) => rq?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  rqColumnHelper.accessor((rq) => rq?.scopes, {
    id: 'scopes',
    header: 'Scopes',
    cell: ({ getValue }) => getValue()?.map((scope) => <div>{scope}</div>),
  }),
  rqColumnHelper.accessor((rq) => rq?.statusList, {
    id: 'statusList',
    header: 'Status list',
    cell: ({ getValue }) => <Code>{JSON.stringify(getValue())}</Code>,
  }),
]

const lrColumnHelper = createColumnHelper<LimitRangeT>()

const lrColumns = [
  lrColumnHelper.accessor((lr) => lr?.resourceName, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  lrColumnHelper.accessor((lr) => lr?.resourceType, {
    id: 'type',
    header: 'Type',
    cell: ({ getValue }) => getValue(),
  }),
  lrColumnHelper.accessor((lr) => lr?.default, {
    id: 'default',
    header: 'Default',
    cell: ({ getValue }) => getValue(),
  }),
  lrColumnHelper.accessor((lr) => lr?.defaultRequest, {
    id: 'defaultRequest',
    header: 'Default request',
    cell: ({ getValue }) => getValue(),
  }),
]

export function NamespaceInfo(): ReactElement {
  const namespace = useOutletContext() as NamespaceT

  return (
    <>
      {!isEmpty(namespace?.resourceQuotaList?.items) && (
        <section>
          <SubTitle>Resource quotas</SubTitle>
          <Table
            data={namespace?.resourceQuotaList?.items}
            columns={rqColumns}
            css={{
              maxHeight: '500px',
              height: '100%',
            }}
          />
        </section>
      )}
      {!isEmpty(namespace?.resourceLimits) && (
        <section>
          <SubTitle>Resource limits</SubTitle>
          <Table
            data={namespace?.resourceLimits}
            columns={lrColumns}
            css={{
              maxHeight: '500px',
              height: '100%',
            }}
          />
        </section>
      )}
    </>
  )
}

export function NamespaceEvents(): ReactElement {
  const { name } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      NamespaceEventsQuery,
      NamespaceEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useNamespaceEventsQuery}
      queryOptions={{
        variables: { name } as NamespaceEventsQueryVariables,
      }}
      queryName="handleGetNamespaceEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
