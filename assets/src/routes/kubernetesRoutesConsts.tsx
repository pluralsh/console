export const KUBERNETES_OPTIONAL_PARAM_CLUSTER = ':clusterId?'
export const KUBERNETES_ABS_PATH = getKubernetesAbsPath(
  KUBERNETES_OPTIONAL_PARAM_CLUSTER
)

export const SERVICES_AND_INGRESSES_REL_PATH = 'servicesandingresses'
export const STORAGE_REL_PATH = 'storage'
export const CONFIGURATION_REL_PATH = 'configuration'

export const WORKLOADS_REL_PATH = 'workloads'
export const DEPLOYMENTS_REL_PATH = 'deployments'
export const PODS_REL_PATH = 'pods'
export const REPLICA_SETS_REL_PATH = 'replicasets'
export const STATEFUL_SETS_REL_PATH = 'statefulsets'
export const DAEMON_SETS_REL_PATH = 'daemonsets'
export const JOBS_REL_PATH = 'jobs'
export const CRON_JOBS_REL_PATH = 'cronjobs'
export const REPLICATION_CONTROLLERS_REL_PATH = 'replicationcontrollers'

export const SERVICES_REL_PATH = 'services'
export const INGRESSES_REL_PATH = 'ingresses'

export const PERSISTENT_VOLUME_CLAIMS_REL_PATH = 'persistentvolumeclaims'
export const PERSISTENT_VOLUME_REL_PATH = 'persistentvolumes'
export const STORAGE_CLASSES_REL_PATH = 'storageclasses'

export const CONFIG_MAPS_REL_PATH = 'configmaps'
export const SECRETS_REL_PATH = 'secrets'

export function getKubernetesAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}`
}

export function getWorkloadsAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${WORKLOADS_REL_PATH}`
}

export function getServicesAndIngressesAbsPath(
  clusterId: string | null | undefined
) {
  return `/kubernetes/${clusterId}/${SERVICES_AND_INGRESSES_REL_PATH}`
}

export function getStorageAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${STORAGE_REL_PATH}`
}

export function getConfigurationAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${CONFIGURATION_REL_PATH}`
}
