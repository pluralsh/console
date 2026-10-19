import {
  INGRESSES_REL_PATH,
  INGRESS_CLASSES_REL_PATH,
  NETWORK_POLICIES_REL_PATH,
  SERVICES_REL_PATH,
  getNetworkAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { Maybe } from 'generated/graphql-plural'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'

export const getNetworkBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'network',
    url: getNetworkAbsPath(cluster?.id),
  },
]

const directory = [
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: INGRESSES_REL_PATH, label: 'Ingresses' },
  { path: INGRESS_CLASSES_REL_PATH, label: 'Ingress classes' },
  { path: NETWORK_POLICIES_REL_PATH, label: 'Network policies' },
] as const

export default function Network() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getNetworkAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
