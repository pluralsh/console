import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  Common_Event as EventT,
  Common_EventList as EventListT,
  CustomResourceEventsDocument,
  CustomResourceEventsQuery,
  CustomResourceEventsQueryVariables,
  CustomResourceQueryVariables,
  useCustomResourceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'

import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './CustomResourceDefinitions'

const directory: Array<TabEntry> = [
  { path: '', label: 'Raw' },
  { path: 'events', label: 'Events' },
] as const

export default function CustomResource(): ReactElement<any> {
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
            Kind.CustomResourceDefinition,
            crd
          ),
        },
        ...(namespace
          ? [
              {
                label: namespace,
                url: `${getResourceDetailsAbsPath(
                  clusterId,
                  Kind.CustomResourceDefinition,
                  crd
                )}?${NAMESPACE_PARAM}=${namespace}`,
              },
            ]
          : []),
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

export function CustomResourceEvents(): ReactElement<any> {
  const { name, namespace, crd } = useParams()
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
      queryDocument={CustomResourceEventsDocument}
      queryOptions={{
        variables: {
          name,
          namespace,
          crd,
        } as CustomResourceEventsQueryVariables,
      }}
      queryName="handleGetCustomResourceObjectEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
