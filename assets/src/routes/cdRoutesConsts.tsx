import { FLOW_ABS_PATH, getFlowDetailsPath } from './flowRoutesConsts'

function encodeSlashes(str: string) {
  return str.replaceAll('/', '%2F')
}

export const CD_REL_PATH = 'cd' as const
export const CD_ABS_PATH = `/${CD_REL_PATH}` as const
export const CLUSTERS_REL_PATH = 'clusters' as const
export const SERVICES_REL_PATH = 'services' as const
export const SERVICES_TREE_REL_PATH = 'tree' as const
export const PIPELINES_REL_PATH = 'pipelines' as const
export const PIPELINES_ABS_PATH =
  `${CD_ABS_PATH}/${PIPELINES_REL_PATH}` as const
export const OBSERVERS_REL_PATH = 'observers' as const
export const OBSERVERS_ABS_PATH =
  `${CD_ABS_PATH}/${OBSERVERS_REL_PATH}` as const
export const PROVIDERS_REL_PATH = 'providers' as const
export const REPOS_REL_PATH = 'repos' as const
export const CD_DEFAULT_REL_PATH = CLUSTERS_REL_PATH
export const CD_DEFAULT_ABS_PATH =
  `${CD_ABS_PATH}/${CD_DEFAULT_REL_PATH}` as const

export const CLUSTER_PARAM_ID = `clusterId` as const
export const CLUSTER_REL_PATH =
  `${CLUSTERS_REL_PATH}/:${CLUSTER_PARAM_ID}` as const
export const CLUSTER_ABS_PATH = `${CD_ABS_PATH}/${CLUSTER_REL_PATH}` as const
export const CLUSTER_SERVICES_PATH = 'services' as const
export const CLUSTER_METRICS_PATH = 'metrics' as const
export const CLUSTER_DETAILS_PATH = 'details' as const
export const CLUSTER_NETWORK_PATH = 'network' as const
export const CLUSTER_NODES_PATH = 'nodes' as const
export const CLUSTER_INSIGHTS_PATH = 'insights' as const
export const CLUSTER_INSIGHTS_SUMMARY_PATH = '' as const
export const CLUSTER_INSIGHTS_COMPONENTS_PATH = 'components' as const
export const CLUSTER_METADATA_PATH = 'metadata' as const
export const CLUSTER_ADDONS_REL_PATH = 'addons' as const
export const CLUSTER_ALL_ADDONS_REL_PATH = 'all' as const
export const CLUSTER_CLOUD_ADDONS_REL_PATH = 'cloud' as const
export const CLUSTER_ADDONS_PARAM_ID = 'addOnId' as const
export const CLUSTER_PRS_REL_PATH = 'prs' as const
export const CLUSTER_VCLUSTERS_REL_PATH = 'vclusters' as const
export const CLUSTER_LOGS_PATH = 'logs' as const
export const CLUSTER_ALERTS_REL_PATH = 'alerts' as const
export const SERVICE_SETTINGS_GIT_REL_PATH = 'git' as const
export const SERVICE_SETTINGS_HELM_REL_PATH = 'helm' as const
export const SERVICE_SETTINGS_SECRETS_REL_PATH = 'secrets' as const
export const SERVICE_SETTINGS_REVISIONS_REL_PATH = 'revisions' as const
export const NODE_PARAM_NAME = 'name' as const
export const NODE_PARAM_CLUSTER = 'clusterId' as const

export const NODE_REL_PATH = getNodeDetailsPath({
  isRelative: true,
  clusterId: `:${NODE_PARAM_CLUSTER}`,
  name: `:${NODE_PARAM_NAME}`,
})
export const NODE_ABS_PATH = getNodeDetailsPath({
  clusterId: `:${NODE_PARAM_CLUSTER}`,
  name: `:${NODE_PARAM_NAME}`,
})

export const SERVICE_PARAM_ID = 'serviceId' as const
export const SERVICE_PARAM_CLUSTER_ID = 'clusterId' as const
export const CD_SERVICE_REL_PATH = getServiceDetailsPath({
  type: 'cd',
  isRelative: true,
  clusterId: `:${SERVICE_PARAM_CLUSTER_ID}`,
  serviceId: `:${SERVICE_PARAM_ID}`,
})
export const CD_SERVICE_PATH_MATCHER_ABS =
  `${CLUSTER_ABS_PATH}/${SERVICES_REL_PATH}/:${SERVICE_PARAM_ID}` as const
export const FLOW_SERVICE_PATH_MATCHER_ABS =
  `${FLOW_ABS_PATH}/${SERVICES_REL_PATH}/:${SERVICE_PARAM_ID}` as const

export const SERVICE_COMPONENTS_PATH = 'components'
export const SERVICE_PRS_PATH = 'prs'

export const COMPONENT_PARAM_ID = `componentId` as const
export const CD_SERVICE_COMPONENT_PATH_MATCHER_ABS = `${CD_SERVICE_PATH_MATCHER_ABS}/${SERVICE_COMPONENTS_PATH}/:${COMPONENT_PARAM_ID}`
export const FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS = `${FLOW_SERVICE_PATH_MATCHER_ABS}/${SERVICE_COMPONENTS_PATH}/:${COMPONENT_PARAM_ID}`

export const GLOBAL_SERVICES_REL_PATH = 'globalservices'
export const GLOBAL_SERVICE_PARAM_ID = 'globalServiceId' as const
export const GLOBAL_SERVICE_INFO_PATH = 'info' as const
export const GLOBAL_SERVICE_SERVICES_PATH = 'services' as const

export const NAMESPACES_REL_PATH = 'namespaces'
export const NAMESPACES_ABS_PATH = `${CD_ABS_PATH}/${NAMESPACES_REL_PATH}`
export const NAMESPACES_PARAM_ID = 'namespaceId' as const
export const NAMESPACE_INFO_PATH = 'info' as const
export const NAMESPACE_SERVICES_PATH = 'services' as const

export const PODS_REL_PATH = 'pods' as const
export const POD_PARAM_NAME = 'name' as const
export const POD_PARAM_NAMESPACE = 'namespace' as const
export const POD_PARAM_CLUSTER = 'clusterId' as const

export const ALERT_INSIGHT_REL_PATH =
  `${CLUSTER_ALERTS_REL_PATH}/insight/:insightId` as const

export function getClusterDetailsPath({
  clusterId,
  isRelative = false,
}: {
  clusterId?: Nullable<string>
  isRelative?: boolean
}) {
  return `${
    isRelative ? '' : `${CD_ABS_PATH}/`
  }${CLUSTERS_REL_PATH}/${clusterId}`
}

export function getServiceDetailsPath({
  type = 'cd',
  clusterId,
  serviceId,
  flowId,
  isRelative = false,
}: Parameters<typeof getClusterDetailsPath>[0] & {
  type?: 'cd' | 'flow'
  serviceId: Nullable<string>
  flowId?: Nullable<string>
}) {
  return `${
    type === 'cd'
      ? getClusterDetailsPath({ clusterId, isRelative })
      : getFlowDetailsPath({ flowId })
  }/${SERVICES_REL_PATH}/${encodeSlashes(serviceId || '')}`
}

export function getServiceSettingsPath({
  subTab,
  ...props
}: Parameters<typeof getServiceDetailsPath>[0] & {
  subTab: string
}) {
  return `${getServiceDetailsPath({ ...props })}/settings/${subTab}`
}

export function getGlobalServiceDetailsPath({
  serviceId,
}: {
  serviceId: string | null | undefined
}) {
  return `${CD_ABS_PATH}/${GLOBAL_SERVICES_REL_PATH}/${encodeSlashes(
    serviceId || ''
  )}`
}

export function getNamespacesDetailsPath({
  namespaceId,
}: {
  namespaceId: string | null | undefined
}) {
  return `${CD_ABS_PATH}/${NAMESPACES_REL_PATH}/${encodeSlashes(
    namespaceId || ''
  )}`
}

export function getClusterAddOnDetailsPath({
  clusterId,
  addOnId,
  isCloudAddon = false,
  isRelative = false,
}: Parameters<typeof getClusterDetailsPath>[0] & {
  addOnId: string | null | undefined
  isCloudAddon?: boolean
}) {
  return `${getClusterDetailsPath({
    clusterId,
    isRelative,
  })}/${CLUSTER_ADDONS_REL_PATH}/${isCloudAddon ? CLUSTER_CLOUD_ADDONS_REL_PATH : CLUSTER_ALL_ADDONS_REL_PATH}/${encodeSlashes(addOnId || '')}`
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
    isRelative ? '' : `${CD_ABS_PATH}/`
  }${CLUSTERS_REL_PATH}/${clusterId}/${CLUSTER_NODES_PATH}/${name}`
}

export function getPodDetailsPath({
  type = 'cluster',
  clusterId,
  serviceId,
  flowId,
  name,
  namespace,
  isRelative = false,
}: {
  type: 'cluster' | 'service' | 'flow'
  clusterId?: Nullable<string>
  serviceId?: Nullable<string>
  flowId?: Nullable<string>
  name?: Nullable<string>
  namespace?: Nullable<string>
  isRelative?: boolean
}) {
  let path = ''
  switch (type) {
    case 'cluster':
      path = `${getClusterDetailsPath({ clusterId, isRelative })}`
      break
    case 'service':
      path = getServiceDetailsPath({
        type: 'cd',
        clusterId,
        serviceId,
        isRelative,
      })
      break
    case 'flow':
      path = getServiceDetailsPath({
        type: 'flow',
        serviceId,
        flowId,
        isRelative,
      })
      break
  }

  path += `/${PODS_REL_PATH}`

  if (namespace) {
    path += `/${namespace}`
  }

  if (name) {
    path += `/${name}`
  }

  return path
}
