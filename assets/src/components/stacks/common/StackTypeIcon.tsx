import { AnsibleIcon, TerraformIcon } from '@pluralsh/design-system'
import { StackType } from 'generated/graphql'

export function StackTypeIcon({
  stackType,
  size = 16,
}: {
  stackType: Nullable<StackType>
  size?: number
}) {
  switch (stackType) {
    case StackType.Ansible:
      return <AnsibleIcon size={size} />
    case StackType.Terraform:
      return <TerraformIcon size={size} />
  }

  return undefined
}
