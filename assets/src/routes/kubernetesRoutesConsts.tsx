export const KUBERNETES_OPTIONAL_PARAM_CLUSTER = ':clusterId?'
export const KUBERNETES_ABS_PATH = getKubernetesAbsPath(
  KUBERNETES_OPTIONAL_PARAM_CLUSTER
)

export const WORKLOADS_REL_PATH = 'workloads'
export const SERVICES_REL_PATH = 'services'
export const STORAGE_REL_PATH = 'storage'
export const CONFIGURATION_REL_PATH = 'configuration'

export function getKubernetesAbsPath(clusterId: string | null | undefined) {
  return `/kubernetes/${clusterId}`
}
