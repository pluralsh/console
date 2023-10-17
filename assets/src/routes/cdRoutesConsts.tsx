export const CD_BASE_PATH = 'cd' as const
export const CLUSTERS_PATH = 'clusters' as const
export const SERVICES_PATH = 'services' as const

export const CLUSTER_BASE_PATH = `${CD_BASE_PATH}/${CLUSTERS_PATH}/:clusterId`
export const CLUSTER_SERVICES_PATH = 'services' as const
export const CLUSTER_NODES_PATH = 'nodes' as const
export const CLUSTER_PODS_PATH = 'pods' as const

export const NODE_PARAM_NAME = 'nodeName' as const
export const NODE_PARAM_CLUSTER = 'clusterId' as const
export const NODE_BASE_PATH = getNodeDetailsPath({
  isRelative: true,
  clusterId: `:${NODE_PARAM_CLUSTER}`,
  nodeName: `:${NODE_PARAM_NAME}`,
})

export const SERVICE_PARAM_ID = 'serviceId' as const
export const SERVICE_PARAM_CLUSTER = 'clusterName' as const
export const SERVICE_BASE_PATH = getServiceDetailsPath({
  isRelative: true,
  clusterName: `:${SERVICE_PARAM_CLUSTER}`,
  serviceId: `:${SERVICE_PARAM_ID}`,
})
export const SERVICE_COMPONENTS_PATH = 'components'

export const COMPONENT_PARAM_KIND = `componentKind` as const
export const COMPONENT_PARAM_NAME = `componentName` as const
export const COMPONENT_PARAM_VERSION = `componentVersion` as const
export const SERVICE_COMPONENT_PATH_MATCHER_REL = getServiceComponentPath({
  isRelative: true,
  clusterName: `:${SERVICE_PARAM_CLUSTER}`,
  serviceId: `:${SERVICE_PARAM_ID}`,
  componentKind: `:${COMPONENT_PARAM_KIND}`,
  componentName: `:${COMPONENT_PARAM_NAME}`,
  componentVersion: `:${COMPONENT_PARAM_VERSION}`,
})
export const SERVICE_COMPONENT_PATH_MATCHER_ABS = `/${SERVICE_COMPONENT_PATH_MATCHER_REL}`

export function getServiceDetailsPath({
  clusterName,
  serviceId,
  isRelative = false,
}: {
  clusterName: string | null | undefined
  serviceId: string | null | undefined
  isRelative?: boolean
}) {
  return `${
    isRelative ? '' : '/'
  }${CD_BASE_PATH}/${SERVICES_PATH}/${clusterName}/${serviceId}`
}

export function getServiceComponentPath({
  componentKind,
  componentName,
  componentVersion,
  ...props
}: Parameters<typeof getServiceDetailsPath>[0] & {
  componentKind: string | null | undefined
  componentName: string | null | undefined
  componentVersion: string | null | undefined
}) {
  return `${getServiceDetailsPath({
    ...props,
  })}/${SERVICE_COMPONENTS_PATH}/${componentKind}/${componentName}/${componentVersion}`
}

export function getNodeDetailsPath({
  clusterId,
  nodeName,
  isRelative = false,
}: {
  clusterId: string | null | undefined
  nodeName: string | null | undefined
  isRelative?: boolean
}) {
  return `${
    isRelative ? '' : '/'
  }${CD_BASE_PATH}/${CLUSTERS_PATH}/${clusterId}/${CLUSTER_NODES_PATH}/${nodeName}`
}
