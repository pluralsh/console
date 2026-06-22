import { StackType } from 'generated/graphql'

export const STACK_TYPE_LABELS: Record<StackType, string> = {
  [StackType.Ansible]: 'Ansible',
  [StackType.Custom]: 'Custom',
  [StackType.Terraform]: 'Terraform',
  [StackType.Terragrunt]: 'Terragrunt',
}

const TERRAFORM_FAMILY_STACK_TYPES = new Set<StackType>([
  StackType.Terraform,
  StackType.Terragrunt,
])

export function stackTypeLabel(type: Nullable<StackType>): string {
  if (!type) return '-'
  return STACK_TYPE_LABELS[type] ?? type
}

export function isTerraformFamilyStackType(type: Nullable<StackType>): boolean {
  return !!type && TERRAFORM_FAMILY_STACK_TYPES.has(type)
}
