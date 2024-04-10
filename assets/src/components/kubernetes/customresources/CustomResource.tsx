import React, { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { MetadataSidecar, useKubernetesCluster } from '../utils'
import {
  CustomResourceQueryVariables,
  useCustomResourceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { getBreadcrumbs } from './CustomResourceDefinitions'

const directory: Array<TabEntry> = [{ path: '', label: 'Raw' }] as const

export default function CustomResource(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '', crd = '' } = useParams()
  const { data, loading } = useCustomResourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
      crd,
    } as CustomResourceQueryVariables,
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
        {
          label: namespace ?? '',
        },
        {
          label: name ?? '',
        },
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
