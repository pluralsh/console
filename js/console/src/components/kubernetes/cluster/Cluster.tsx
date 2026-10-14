import {
  EVENTS_REL_PATH,
  HPAS_REL_PATH,
  NAMESPACES_REL_PATH,
  NODES_REL_PATH,
  getClusterAbsPath,
  PDBS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { Maybe } from 'generated/graphql-plural'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'

export const getClusterBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'cluster',
    url: getClusterAbsPath(cluster?.id),
  },
]

const directory = [
  { path: NODES_REL_PATH, label: 'Nodes' },
  { path: EVENTS_REL_PATH, label: 'Events' },
  { path: NAMESPACES_REL_PATH, label: 'Namespaces' },
  { path: HPAS_REL_PATH, label: 'Horizontal Pod Autoscalers' },
  { path: PDBS_REL_PATH, label: 'Pod Disruption Budgets' },
] as const

export default function Cluster() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getClusterAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
