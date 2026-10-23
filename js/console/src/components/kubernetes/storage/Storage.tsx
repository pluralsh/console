import {
  PERSISTENT_VOLUMES_REL_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  STORAGE_CLASSES_REL_PATH,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'
import { Maybe } from 'generated/graphql-plural'

export const getStorageBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'storage',
    url: getStorageAbsPath(cluster?.id),
  },
]

const directory = [
  {
    path: PERSISTENT_VOLUME_CLAIMS_REL_PATH,
    label: 'Persistent volume claims',
  },
  { path: PERSISTENT_VOLUMES_REL_PATH, label: 'Persistent volumes' },
  { path: STORAGE_CLASSES_REL_PATH, label: 'Storage classes' },
] as const

export default function Storage() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getStorageAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
