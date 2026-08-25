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
export const POLICIES_CREATE_REL_PATH = 'create' as const
export const POLICIES_CREATE_ABS_PATH =
  `${POLICIES_ABS_PATH}/${POLICIES_CREATE_REL_PATH}` as const
export const POLICIES_EDIT_REL_PATH = 'edit' as const
export const POLICIES_PARAM_ID = 'policyId' as const
export const POLICIES_DEFINITION_REL_PATH = 'definition' as const
export const POLICIES_EVALUATIONS_REL_PATH = 'evaluations' as const
export const POLICIES_ATTACHMENTS_REL_PATH = 'attachments' as const

export function getPolicyEditAbsPath(policyId: string) {
  return `${POLICIES_ABS_PATH}/${policyId}/${POLICIES_EDIT_REL_PATH}`
}

export function getPolicyDetailsAbsPath(
  policyId: string,
  tab: string = POLICIES_DEFINITION_REL_PATH
) {
  return `${POLICIES_ABS_PATH}/${policyId}/${tab}`
}

export const POLICIES_ATTACHMENT_RULES_REL_PATH = 'attachment-rules' as const
export const POLICIES_ATTACHMENT_RULES_ABS_PATH =
  `${POLICIES_ABS_PATH}/${POLICIES_ATTACHMENT_RULES_REL_PATH}` as const
export const POLICIES_ATTACHMENT_RULES_CREATE_ABS_PATH =
  `${POLICIES_ATTACHMENT_RULES_ABS_PATH}/${POLICIES_CREATE_REL_PATH}` as const
export const ATTACHMENT_RULES_PARAM_ID = 'attachmentRuleId' as const

export function getAttachmentRuleEditAbsPath(attachmentRuleId: string) {
  return `${POLICIES_ATTACHMENT_RULES_ABS_PATH}/${attachmentRuleId}/${POLICIES_EDIT_REL_PATH}`
}

export const GATEKEEPER_REL_PATH = 'gatekeeper' as const
export const GATEKEEPER_ABS_PATH =
  `${SECURITY_ABS_PATH}/${GATEKEEPER_REL_PATH}` as const
export const GATEKEEPER_PARAM_ID = 'constraintId' as const
export const GATEKEEPER_DETAILS_PATH = `details` as const
export const GATEKEEPER_AFFECTED_RESOURCES_PATH = `affectedResources` as const

export const VULNERABILITY_REPORTS_REL_PATH = `vulnerability-reports` as const
export const VULNERABILITY_REPORTS_ABS_PATH =
  `${SECURITY_ABS_PATH}/${VULNERABILITY_REPORTS_REL_PATH}` as const
export const VULNERABILITY_REPORT_PARAM_ID = 'vulnerabilityReportId' as const

export function getGatekeeperPath({
  constraintId,
  tab = GATEKEEPER_DETAILS_PATH,
}: {
  constraintId: string | null | undefined
  tab?: string
}) {
  return `${GATEKEEPER_ABS_PATH}/${constraintId}/${tab}`
}

export function getVulnerabilityReportsPath({
  clusterId,
  flowIdOrName,
}: {
  clusterId?: Nullable<string>
  flowIdOrName?: Nullable<string>
}) {
  return flowIdOrName
    ? `${getFlowDetailsPath({ flowIdOrName })}/${VULNERABILITY_REPORTS_REL_PATH}`
    : `${VULNERABILITY_REPORTS_ABS_PATH}/${clusterId ?? ''}`
}

export function getVulnerabilityReportDetailsPath({
  clusterId,
  flowIdOrName,
  vulnerabilityReportId,
}: {
  clusterId?: Nullable<string>
  flowIdOrName?: Nullable<string>
  vulnerabilityReportId: string
}) {
  return flowIdOrName
    ? `${getFlowDetailsPath({ flowIdOrName })}/${VULNERABILITY_REPORTS_REL_PATH}/${vulnerabilityReportId}`
    : `${VULNERABILITY_REPORTS_ABS_PATH}/${clusterId}/report/${vulnerabilityReportId}`
}
