import pluralize from 'pluralize'

import { Kind } from '../components/kubernetes/common/types'

export const KUBERNETES_ROOT_PATH = 'kubernetes'
export const KUBERNETES_PARAM_CLUSTER = ':clusterId?'
export const KUBERNETES_ABS_PATH = getKubernetesAbsPath(
  KUBERNETES_PARAM_CLUSTER
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

export const NETWORK_REL_PATH = 'network'
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

export const RBAC_REL_PATH = 'rbac'
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

export const AUDIT_REL_PATH = 'audit'

export const NAMESPACED_RESOURCE_DETAILS_REL_PATH = ':namespace/:name'
export const RESOURCE_DETAILS_REL_PATH = ':name'

export function getKubernetesAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}`
}

export function getWorkloadsAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${WORKLOADS_REL_PATH}`
}

export function getNetworkAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${NETWORK_REL_PATH}`
}

export function getStorageAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${STORAGE_REL_PATH}`
}

export function getConfigurationAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${CONFIGURATION_REL_PATH}`
}

export function getClusterAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${CLUSTER_REL_PATH}`
}

export function getRbacAbsPath(clusterId: string | null | undefined) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${RBAC_REL_PATH}`
}

export function getCustomResourcesAbsPath(
  clusterId: string | null | undefined
) {
  return `/${KUBERNETES_ROOT_PATH}/${clusterId}/${CUSTOM_RESOURCES_REL_PATH}`
}

export function getResourceDetailsAbsPath(
  clusterId: Nullable<string>,
  kind: Nullable<Kind | string>,
  name: Nullable<string>,
  namespace?: Nullable<string>
): string {
  return namespace
    ? `/${KUBERNETES_ROOT_PATH}/${clusterId}/${pluralize(
        kind ?? ''
      )}/${namespace}/${name}`
    : `/${KUBERNETES_ROOT_PATH}/${clusterId}/${pluralize(kind ?? '')}/${name}`
}

export function getCustomResourceDetailsAbsPath(
  clusterId: Nullable<string>,
  kind: Nullable<string>,
  name: Nullable<string>,
  namespace?: Nullable<string>
): string {
  return namespace
    ? `/${KUBERNETES_ROOT_PATH}/${clusterId}/${CUSTOM_RESOURCES_REL_PATH}/${kind}/${namespace}/${name}`
    : `/${KUBERNETES_ROOT_PATH}/${clusterId}/${CUSTOM_RESOURCES_REL_PATH}/${kind}/${name}`
}

const supportedGVKs = new Set([
  // Workloads
  'v1/pod',
  'apps/v1/deployment',
  'apps/v1/replicaset',
  'apps/v1/statefulset',
  'apps/v1/daemonset',
  'batch/v1/job',
  'batch/v1/cronjob',
  'v1/replicationcontroller',

  // Network
  'v1/service',
  'networking.k8s.io/v1/ingress',
  'networking.k8s.io/v1/ingressclass',
  'networking.k8s.io/v1/networkpolicy',

  // Storage
  'v1/persistentvolume',
  'v1/persistentvolumeclaim',
  'storage.k8s.io/v1/storageclass',

  // Configuration
  'v1/configmap',
  'v1/secret',

  // RBAC
  'rbac.authorization.k8s.io/v1/role',
  'rbac.authorization.k8s.io/v1/rolebinding',
  'rbac.authorization.k8s.io/v1/clusterrole',
  'rbac.authorization.k8s.io/v1/clusterrolebinding',
  'v1/serviceaccount',

  // Cluster
  'v1/node',
  'v1/namespace',
])

export function getKubernetesResourcePath({
  clusterId,
  group,
  version,
  kind,
  name,
  namespace,
}: {
  clusterId: Nullable<string>
  group?: Nullable<string>
  version: Nullable<string>
  kind: Nullable<string>
  name: Nullable<string>
  namespace?: Nullable<string>
}) {
  const gvk = `${group ? `${group}/` : ''}${version}/${kind}`.toLowerCase()

  return supportedGVKs.has(gvk)
    ? getResourceDetailsAbsPath(clusterId, kind, name, namespace)
    : undefined
}
