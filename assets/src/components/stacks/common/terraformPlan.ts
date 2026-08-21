/**
 * Converts `terraform show -json` output into the reduced plan Spacelift
 * exposes to plan policies, instead of passing the full Terraform document.
 *
 * See: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
 */

export type TerraformPlanAction =
  'create' | 'update' | 'delete' | 'no-op' | 'read'

export type PolicyResourceChange = {
  address?: string
  type?: string
  name?: string
  provider_name?: string | null
  change: {
    actions: TerraformPlanAction[]
    before?: unknown
    after?: unknown
  }
}

export type PolicyPlan = {
  terraform_version?: string | null
  resource_changes: PolicyResourceChange[]
}

type TerraformChange = {
  actions?: TerraformPlanAction[]
  before?: unknown
  after?: unknown
  after_unknown?: unknown
  before_sensitive?: unknown
  after_sensitive?: unknown
}

type TerraformResourceChange = {
  address?: string
  mode?: string
  type?: string
  name?: string
  provider_name?: string
  change?: TerraformChange
}

type TerraformPlan = {
  format_version?: string
  terraform_version?: string
  resource_changes?: TerraformResourceChange[]
}

export function toPolicyPlan(
  plan: TerraformPlan | null | undefined
): PolicyPlan {
  if (!plan) return { terraform_version: null, resource_changes: [] }

  return {
    terraform_version: plan.terraform_version ?? null,
    resource_changes: (plan.resource_changes ?? []).map(convertChange),
  }
}

function convertChange(change: TerraformResourceChange): PolicyResourceChange {
  return {
    address: change.address,
    type: change.type,
    name: change.name,
    provider_name: providerName(change.provider_name),
    change: {
      actions: change.change?.actions ?? [],
      before: change.change?.before,
      after: change.change?.after,
    },
  }
}

function providerName(name?: string): string | undefined {
  if (!name) return name
  const parts = name.split('/')
  return parts[parts.length - 1]
}
