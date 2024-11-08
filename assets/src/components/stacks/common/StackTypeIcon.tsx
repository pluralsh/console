import {
  AnsibleIcon,
  StackIcon,
  TerraformLogoIcon,
} from '@pluralsh/design-system'
import { StackType } from 'generated/graphql'

export function StackTypeIcon({
  stackType,
  size = 16,
  fullColor = false,
  color,
}: {
  stackType: Nullable<StackType>
  size?: number
  fullColor?: boolean
  color?: string
}) {
  switch (stackType) {
    case StackType.Ansible:
      return (
        <AnsibleIcon
          size={size}
          fullColor={fullColor}
          color={color}
        />
      )
    case StackType.Terraform:
      return (
        <TerraformLogoIcon
          size={size}
          fullColor={fullColor}
          color={color}
        />
      )
    default:
      return (
        <StackIcon
          size={size}
          fullColor={fullColor}
          color={color}
        />
      )
  }
}
