import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { CommonEvent, CommonEventList } from '../../../generated/kubernetes'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList.tsx'

import { Kind } from '../common/types'

import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './CustomResourceDefinitions'
import {
  getCustomResourceObjectEventsInfiniteOptions,
  getCustomResourceObjectOptions,
} from 'generated/kubernetes/@tanstack/react-query.gen.ts'

const directory: Array<TabEntry> = [
  { path: '', label: 'Raw' },
  { path: 'events', label: 'Events' },
] as const

export default function CustomResource(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '', crd = '' } = useParams()
  const {
    data: cr,
    isFetching,
    error,
  } = useQuery({
    ...getCustomResourceObjectOptions({
      client: AxiosInstance(clusterId),
      path: { object: name, namespace, crd },
    }),
    refetchInterval: 30_000,
  })

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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
    return <LoadingIndicator />
  }

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
  const { name = '', namespace, crd = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getCustomResourceObjectEventsInfiniteOptions}
      pathParams={{
        object: name,
        namespace,
        crd,
      }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
