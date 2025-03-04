import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { MetadataSidecar } from '../common/utils'
import {
  PodDisruptionBudgetQueryVariables,
  usePodDisruptionBudgetQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  getResourceDetailsAbsPath,
  getClusterAbsPath,
  PDBS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './PodDisruptionBudgets'
import { LabelSelector } from '../common/LabelSelector.tsx'
import { isNullish } from '@apollo/client/cache/inmemory/helpers'

const directory: Array<TabEntry> = [{ path: '', label: 'Raw' }] as const

export default function PodDisruptionBudget(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = usePodDisruptionBudgetQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: { name, namespace } as PodDisruptionBudgetQueryVariables,
  })

  const pdb = data?.handleGetPodDisruptionBudgetDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getClusterAbsPath(
            cluster?.id
          )}/${PDBS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.PodDisruptionBudget,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  console.log(pdb)

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={pdb}>
          {pdb?.labelSelector && (
            <SidecarItem heading="Label selector">
              <LabelSelector selector={pdb?.labelSelector} />
            </SidecarItem>
          )}
          {!isNullish(pdb?.minAvailable) && (
            <SidecarItem heading="Min available">
              {pdb?.minAvailable}
            </SidecarItem>
          )}
          {!isNullish(pdb?.maxUnavailable) && (
            <SidecarItem heading="Max unavailable">
              {pdb?.maxUnavailable}
            </SidecarItem>
          )}
          {pdb?.unhealthyPodEvictionPolicy && (
            <SidecarItem heading="Unhealthy Pod eviction policy">
              {pdb?.unhealthyPodEvictionPolicy}
            </SidecarItem>
          )}
          {!isNullish(pdb?.currentHealthy) && (
            <SidecarItem heading="Current healthy">
              {pdb?.currentHealthy}
            </SidecarItem>
          )}
          {!isNullish(pdb?.desiredHealthy) && (
            <SidecarItem heading="Desired healthy">
              {pdb?.desiredHealthy}
            </SidecarItem>
          )}
          {!isNullish(pdb?.disruptionsAllowed) && (
            <SidecarItem heading="Disruptions allowed">
              {pdb?.disruptionsAllowed}
            </SidecarItem>
          )}
          {!isNullish(pdb?.expectedPods) && (
            <SidecarItem heading="Expected Pods">
              {pdb?.expectedPods}
            </SidecarItem>
          )}
        </MetadataSidecar>
      }
    >
      <Outlet context={pdb} />
    </ResourceDetails>
  )
}
