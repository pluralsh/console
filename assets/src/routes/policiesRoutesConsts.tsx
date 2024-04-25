export const POLICIES_REL_PATH = 'policies' as const
export const POLICIES_ABS_PATH = `/${POLICIES_REL_PATH}` as const
export const POLICY_PARAM_ID = 'policyId' as const
export const POLICIES_DETAILS_PATH = `/:${POLICY_PARAM_ID}/details` as const
export const POLICIES_AFFECTED_RESOURCES_PATH =
  `/:${POLICY_PARAM_ID}/affectedResources` as const
