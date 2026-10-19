import {
  CONFIG_MAPS_REL_PATH,
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { Maybe } from 'generated/graphql-plural'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'

export const getConfigurationBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'configuration',
    url: getConfigurationAbsPath(cluster?.id),
  },
]

const directory = [
  { path: CONFIG_MAPS_REL_PATH, label: 'Config maps' },
  { path: SECRETS_REL_PATH, label: 'Secrets' },
] as const

export default function Configuration() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getConfigurationAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
