import * as pluralize from 'pluralize'

export const KUBERNETES_OPTIONAL_PARAM_CLUSTER = ':clusterId?'
export const KUBERNETES_ABS_PATH = getKubernetesAbsPath(
  KUBERNETES_OPTIONAL_PARAM_CLUSTER
)

export const WORKLOADS_REL_PATH = 'workloads'
export const DEPLOYMENTS_REL_PATH = 'deployments'
export const PODS_REL_PATH = 'pods'
export const REPLICA_SETS_REL_PATH = 'replicasets'
export const STATEFUL_SETS_REL_PATH = 'statefulsets'
export const DAEMON_SETS_REL_PATH = 'daemonsets'
export const JOBS_REL_PATH = 'jobs'
export const CRON_JOBS_REL_PATH = 'cronjobs'
export const REPLICATION_CONTROLLERS_REL_PATH = 'replicationcontrollers'

export const DISCOVERY_REL_PATH = 'discovery'
export const SERVICES_REL_PATH = 'services'
export const INGRESSES_REL_PATH = 'ingresses'
export const INGRESS_CLASSES_REL_PATH = 'ingressclasses'
export const NETWORK_POLICIES_REL_PATH = 'networkpolicies'

export const STORAGE_REL_PATH = 'storage'
export const PERSISTENT_VOLUME_CLAIMS_REL_PATH = 'persistentvolumeclaims'
export const PERSISTENT_VOLUMES_REL_PATH = 'persistentvolumes'
export const STORAGE_CLASSES_REL_PATH = 'storageclasses'

export const CONFIGURATION_REL_PATH = 'configuration'
export const CONFIG_MAPS_REL_PATH = 'configmaps'
export const SECRETS_REL_PATH = 'secrets'

export const ACCESS_REL_PATH = 'access'
export const ROLES_REL_PATH = 'roles'
export const ROLE_BINDINGS_REL_PATH = 'rolebindings'
export const CLUSTER_ROLES_REL_PATH = 'clusterroles'
export const CLUSTER_ROLE_BINDINGS_REL_PATH = 'clusterrolebindings'
export const SERVICE_ACCOUNTS_REL_PATH = 'serviceaccounts'

export const CLUSTER_REL_PATH = 'cluster'
export const NODES_REL_PATH = 'nodes'
export const EVENTS_REL_PATH = 'events'
export const NAMESPACES_REL_PATH = 'namespaces'
export const HPAS_REL_PATH = 'horizontalpodautoscalers'

export const CUSTOM_RESOURCES_REL_PATH = 'customresourcedefinitions'

export const NAMESPACED_RESOURCE_DETAILS_REL_PATH = ':namespace/:name'
export const RESOURCE_DETAILS_REL_PATH = ':name'

export function getKubernetesAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}`
}

export function getWorkloadsAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${WORKLOADS_REL_PATH}`
}

export function getDiscoveryAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${DISCOVERY_REL_PATH}`
}

export function getStorageAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${STORAGE_REL_PATH}`
}

export function getConfigurationAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${CONFIGURATION_REL_PATH}`
}

export function getClusterAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${CLUSTER_REL_PATH}`
}

export function getAccessAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}/${ACCESS_REL_PATH}`
}

export function getCustomResourcesAbsPath(
  clusterId: string | null | undefined
) {
  return `/kubernetes/${clusterId}/${CUSTOM_RESOURCES_REL_PATH}`
}

export function getResourceDetailsAbsPath(
  clusterId: Nullable<string>,
  kind: Nullable<string>,
  name: Nullable<string>,
  namespace?: Nullable<string>
): string {
  return namespace
    ? `/kubernetes/${clusterId}/${pluralize(kind)}/${namespace}/${name}`
    : `/kubernetes/${clusterId}/${pluralize(kind)}/${name}`
}
