import {
  Code,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Common_Event as EventT,
  Common_EventList as EventListT,
  Limitrange_LimitRangeItem as LimitRangeT,
  Namespace_NamespaceDetail as NamespaceT,
  NamespaceEventsDocument,
  NamespaceEventsQuery,
  NamespaceEventsQueryVariables,
  NamespaceQueryVariables,
  Resourcequota_ResourceQuotaDetail as ResourceQuotaT,
  useNamespaceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../utils/SubTitle'

import { useCluster } from '../Cluster'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { useEventsColumns } from './Events'

import { getBreadcrumbs } from './Namespaces'
import { NamespacePhaseChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'raw', label: 'Raw' },
  { path: 'events', label: 'Events' },
] as const

export default function Namespace(): ReactElement<any> {
  const cluster = useCluster()
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
          url: getResourceDetailsAbsPath(clusterId, Kind.Namespace, name),
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

export function NamespaceInfo(): ReactElement<any> {
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

export function NamespaceEvents(): ReactElement<any> {
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
      queryDocument={NamespaceEventsDocument}
      queryOptions={{
        variables: { name } as NamespaceEventsQueryVariables,
      }}
      queryName="handleGetNamespaceEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
