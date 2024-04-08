import React, { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'

import { MetadataSidecar, useKubernetesCluster } from '../utils'
import {
  CustomResourceDefinitionQueryVariables,
  useCustomResourceDefinitionQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { getBreadcrumbs } from './CustomResourceDefinitions'

const directory: Array<TabEntry> = [
  { path: '', label: 'Objects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CustomResourceDefinition(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useCustomResourceDefinitionQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as CustomResourceDefinitionQueryVariables,
  })

  const crd = data?.handleGetCustomResourceDefinitionDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'persistentvolume', name),
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
        <MetadataSidecar resource={crd}>
          <SidecarItem heading="Claim">test</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={crd} />
    </ResourceDetails>
  )
}

export function CustomRersourceDefinitionObjects() {
  return 'Custom resources'
}
