import {
  CRON_JOBS_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  JOBS_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  STATEFUL_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { Maybe } from 'generated/graphql-plural'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { ResourceCategory } from '../common/ResourceCategory'
import { getBaseBreadcrumbs } from '../common/utils'

const directory = [
  { path: DEPLOYMENTS_REL_PATH, label: 'Deployments' },
  { path: PODS_REL_PATH, label: 'Pods' },
  { path: REPLICA_SETS_REL_PATH, label: 'Replica sets' },
  { path: STATEFUL_SETS_REL_PATH, label: 'Stateful sets' },
  { path: DAEMON_SETS_REL_PATH, label: 'Daemon sets' },
  { path: JOBS_REL_PATH, label: 'Jobs' },
  { path: CRON_JOBS_REL_PATH, label: 'Cron jobs' },
  { path: REPLICATION_CONTROLLERS_REL_PATH, label: 'Replication controllers' },
] as const

export const getWorkloadsBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
]

export default function Workloads() {
  const cluster = useCluster()

  return (
    <ResourceCategory
      basePath={getWorkloadsAbsPath(cluster?.id)}
      directory={directory}
    />
  )
}
