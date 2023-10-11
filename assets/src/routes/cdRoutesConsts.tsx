export const CD_BASE_PATH = 'cd' as const
export const CLUSTERS_PATH = 'clusters' as const
export const SERVICES_PATH = 'services' as const

export const CLUSTER_BASE_PATH = `${CD_BASE_PATH}/${CLUSTERS_PATH}/:clusterId`
export const CLUSTER_SERVICES_PATH = 'services' as const

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
  componentVersion?: string | null | undefined
}) {
  return `${getServiceDetailsPath({
    ...props,
  })}/${SERVICE_COMPONENTS_PATH}/${componentKind}/${componentName}${
    componentVersion ? `/${componentVersion}` : ''
  }`
}
