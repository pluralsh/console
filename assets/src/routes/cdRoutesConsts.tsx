function encodeSlashes(str: string) {
  return str.replaceAll('/', '%2F')
}

export const CD_BASE_PATH = 'cd' as const
export const CLUSTERS_PATH = 'clusters' as const
export const SERVICES_PATH = 'services' as const

export const CLUSTER_BASE_PATH = `${CD_BASE_PATH}/${CLUSTERS_PATH}/:clusterId`
export const CLUSTER_SERVICES_PATH = 'services' as const
export const CLUSTER_NODES_PATH = 'nodes' as const
export const CLUSTER_PODS_PATH = 'pods' as const
export const CLUSTER_METADATA_PATH = 'metadata' as const

export const NODE_PARAM_NAME = 'name' as const
export const NODE_PARAM_CLUSTER = 'clusterId' as const
export const NODE_BASE_PATH = getNodeDetailsPath({
  isRelative: true,
  clusterId: `:${NODE_PARAM_CLUSTER}`,
  name: `:${NODE_PARAM_NAME}`,
})

export const POD_PARAM_NAME = 'name' as const
export const POD_PARAM_NAMESPACE = 'namespace' as const
export const POD_PARAM_CLUSTER = 'clusterId' as const
export const POD_BASE_PATH = getPodDetailsPath({
  isRelative: true,
  clusterId: `:${POD_PARAM_CLUSTER}`,
  name: `:${POD_PARAM_NAME}`,
  namespace: `:${POD_PARAM_NAMESPACE}`,
})

export const SERVICE_PARAM_ID = 'serviceId' as const
export const SERVICE_PARAM_CLUSTER = 'clusterName' as const
export const SERVICE_BASE_PATH = getServiceDetailsPath({
  isRelative: true,
  clusterName: `:${SERVICE_PARAM_CLUSTER}`,
  serviceId: `:${SERVICE_PARAM_ID}`,
})
export const SERVICE_COMPONENTS_PATH = 'components'

export const COMPONENT_PARAM_ID = `componentId` as const
export const SERVICE_COMPONENT_PATH_MATCHER_REL = getServiceComponentPath({
  isRelative: true,
  clusterName: `:${SERVICE_PARAM_CLUSTER}`,
  serviceId: `:${SERVICE_PARAM_ID}`,
  componentId: `:${COMPONENT_PARAM_ID}`,
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
  }${CD_BASE_PATH}/${SERVICES_PATH}/${encodeSlashes(
    clusterName || ''
  )}/${encodeSlashes(serviceId || '')}`
}

export function getServiceComponentPath({
  componentId,
  ...props
}: Parameters<typeof getServiceDetailsPath>[0] & {
  componentId: string | null | undefined
}) {
  return `${getServiceDetailsPath({
    ...props,
  })}/${SERVICE_COMPONENTS_PATH}/${componentId}`
}

export function getNodeDetailsPath({
  clusterId,
  name,
  isRelative = false,
}: {
  clusterId: string | null | undefined
  name: string | null | undefined
  isRelative?: boolean
}) {
  return `${
    isRelative ? '' : '/'
  }${CD_BASE_PATH}/${CLUSTERS_PATH}/${clusterId}/${CLUSTER_NODES_PATH}/${name}`
}

export function getPodDetailsPath({
  clusterId,
  name,
  namespace,
  isRelative = false,
}: {
  clusterId: string | null | undefined
  name?: string | null
  namespace?: string | null
  isRelative?: boolean
}) {
  let path = isRelative ? '' : '/'

  path += `${CD_BASE_PATH}/${CLUSTERS_PATH}/${clusterId}/${CLUSTER_PODS_PATH}/`

  if (namespace) {
    path += `${namespace}/`
  }

  if (name) {
    path += `${name}/`
  }

  return path
}
