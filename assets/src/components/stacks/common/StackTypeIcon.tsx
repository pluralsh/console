import { AnsibleIcon, TerraformIcon } from '@pluralsh/design-system'
import { StackType } from 'generated/graphql'

export function StackTypeIcon({
  stackType,
  size = 16,
  color,
}: {
  stackType: Nullable<StackType>
  size?: number
  color?: string
}) {
  switch (stackType) {
    case StackType.Ansible:
      return (
        <AnsibleIcon
          size={size}
          color={color}
        />
      )
    case StackType.Terraform:
      return (
        <TerraformIcon
          size={size}
          color={color}
        />
      )
  }

  return undefined
}
