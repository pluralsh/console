import {
  CLUSTER_ROLES_REL_PATH,
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  ROLES_REL_PATH,
  ROLE_BINDINGS_REL_PATH,
  SERVICE_ACCOUNTS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'

export const getRbacBreadcrumbs = (
  cluster?: Nullable<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'rbac',
    url: getRbacAbsPath(cluster?.id),
  },
]

const directory = [
  { path: ROLES_REL_PATH, label: 'Roles' },
  { path: ROLE_BINDINGS_REL_PATH, label: 'Role bindings' },
  { path: CLUSTER_ROLES_REL_PATH, label: 'Cluster roles' },
  { path: CLUSTER_ROLE_BINDINGS_REL_PATH, label: 'Cluster role bindings' },
  { path: SERVICE_ACCOUNTS_REL_PATH, label: 'Service accounts' },
] as const

export default function Rbac() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getRbacAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
