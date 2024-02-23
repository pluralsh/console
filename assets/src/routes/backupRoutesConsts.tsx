import { CD_ABS_PATH } from './cdRoutesConsts'

export const BACKUPS_ABS_PATH = '/backups'

export const OBJECT_STORES_REL_PATH = 'objectstores'
export const CLUSTERS_REL_PATH = 'clusters'

export const BACKUPS_DEFAULT_REL_PATH = OBJECT_STORES_REL_PATH

export const CLUSTER_PARAM_CLUSTER = ':clusterId'
export const CLUSTER_ABS_PATH = getBackupsClusterAbsPath(CLUSTER_PARAM_CLUSTER)

export const CLUSTER_BACKUPS_REL_PATH = 'backups'
export const CLUSTER_RESTORES_REL_PATH = 'restores'

export const CLUSTER_BACKUPS_DEFAULT_REL_PATH = CLUSTER_BACKUPS_REL_PATH

export function getBackupsClusterAbsPath(clusterId: string | null | undefined) {
  return `${CD_ABS_PATH}/${CLUSTERS_REL_PATH}/${clusterId}`
}
