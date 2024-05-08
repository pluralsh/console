export const POLICIES_REL_PATH = 'policies' as const
export const POLICIES_ABS_PATH = `/${POLICIES_REL_PATH}` as const
export const POLICY_PARAM_ID = 'policyId' as const
export const POLICIES_DETAILS_PATH = `details` as const
export const POLICIES_AFFECTED_RESOURCES_PATH = `affectedResources` as const

export function getPolicyDetailsPath({
  policyId,
}: {
  policyId: string | null | undefined
}) {
  return `${POLICIES_ABS_PATH}/${policyId}/${POLICIES_DETAILS_PATH}`
}
