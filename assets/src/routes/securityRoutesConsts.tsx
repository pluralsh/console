import { getFlowDetailsPath } from './flowRoutesConsts'

export const SECURITY_REL_PATH = 'security' as const
export const SECURITY_ABS_PATH = `/${SECURITY_REL_PATH}` as const

export const SECURITY_OVERVIEW_REL_PATH = 'overview' as const
export const SECURITY_OVERVIEW_ABS_PATH =
  `${SECURITY_ABS_PATH}/${SECURITY_OVERVIEW_REL_PATH}` as const

export const COMPLIANCE_REPORTS_REL_PATH = 'compliance-reports' as const
export const COMPLIANCE_REPORTS_ABS_PATH =
  `${SECURITY_ABS_PATH}/${COMPLIANCE_REPORTS_REL_PATH}` as const

export const POLICIES_REL_PATH = 'policies' as const
export const POLICIES_ABS_PATH =
  `${SECURITY_ABS_PATH}/${POLICIES_REL_PATH}` as const
export const POLICY_PARAM_ID = 'policyId' as const
export const POLICIES_DETAILS_PATH = `details` as const
export const POLICIES_AFFECTED_RESOURCES_PATH = `affectedResources` as const

export const VULNERABILITY_REPORTS_REL_PATH = `vulnerability-reports` as const
export const VULNERABILITY_REPORTS_ABS_PATH =
  `${SECURITY_ABS_PATH}/${VULNERABILITY_REPORTS_REL_PATH}` as const
export const VULNERABILITY_REPORT_PARAM_ID = 'vulnerabilityReportId' as const

export function getPolicyPath({
  policyId,
  tab = POLICIES_DETAILS_PATH,
}: {
  policyId: string | null | undefined
  tab?: string
}) {
  return `${POLICIES_ABS_PATH}/${policyId}/${tab}`
}

export function getVulnerabilityReportsPath({
  clusterId,
  flowId,
}: {
  clusterId?: Nullable<string>
  flowId?: Nullable<string>
}) {
  return flowId
    ? `${getFlowDetailsPath({ flowId })}/${VULNERABILITY_REPORTS_REL_PATH}`
    : `${VULNERABILITY_REPORTS_ABS_PATH}/${clusterId ?? ''}`
}

export function getVulnerabilityReportDetailsPath({
  clusterId,
  flowId,
  vulnerabilityReportId,
}: {
  clusterId?: Nullable<string>
  flowId?: Nullable<string>
  vulnerabilityReportId: string
}) {
  return flowId
    ? `${getFlowDetailsPath({ flowId })}/${VULNERABILITY_REPORTS_REL_PATH}/${vulnerabilityReportId}`
    : `${VULNERABILITY_REPORTS_ABS_PATH}/${clusterId}/report/${vulnerabilityReportId}`
}
