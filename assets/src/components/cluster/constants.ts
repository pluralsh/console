export const POLL_INTERVAL = 10 * 1000
export const SHORT_POLL_INTERVAL = 3 * 1000

export const COMPONENT_LABEL = 'platform.plural.sh/component'
export const KIND_LABEL = 'platform.plural.sh/kind'
export const RESOURCE_LABEL = 'platform.plural.sh/resource'

export type ScalingType = 'DEPLOYMENT' | 'STATEFULSET'
export const ScalingTypes = {
  DEPLOYMENT: 'DEPLOYMENT',
  STATEFULSET: 'STATEFULSET',
} as const satisfies Record<ScalingType, ScalingType>
