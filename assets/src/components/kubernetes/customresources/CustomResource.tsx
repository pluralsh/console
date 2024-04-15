import React, { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { MetadataSidecar } from '../common/utils'
import {
  CustomResourceEventsQuery,
  CustomResourceEventsQueryVariables,
  CustomResourceQueryVariables,
  Common_EventList as EventListT,
  Common_Event as EventT,
  useCustomResourceEventsQuery,
  useCustomResourceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { useCluster } from '../Cluster'

import { useEventsColumns } from '../cluster/Events'
import { ResourceList } from '../common/ResourceList'

import { getBreadcrumbs } from './CustomResourceDefinitions'

const directory: Array<TabEntry> = [
  { path: '', label: 'Raw' },
  { path: 'events', label: 'Events' },
] as const

export default function CustomResource(): ReactElement {
  const cluster = useCluster()
  const { clusterId, name = '', namespace, crd = '' } = useParams()
  const { data, loading } = useCustomResourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: { name, namespace, crd } as CustomResourceQueryVariables,
  })

  const cr = data?.handleGetCustomResourceObjectDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: crd ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            'customresourcedefinition',
            crd
          ),
        },
        ...(namespace ? [{ label: namespace }] : []),
        { label: name ?? '' },
      ],
      [cluster, clusterId, crd, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={cr} />}
    >
      <Outlet />
    </ResourceDetails>
  )
}

export function CustomResourceEvents(): ReactElement {
  const { name } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      CustomResourceEventsQuery,
      CustomResourceEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useCustomResourceEventsQuery}
      queryOptions={{
        variables: { name } as CustomResourceEventsQueryVariables,
      }}
      queryName="handleGetCustomResourceObjectEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
