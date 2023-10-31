import { CheckedShieldIcon, Tooltip } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

export const CLUSTER_PROTECT_TT_TEXT =
  'This cluster cannot be deleted until you disable delete protection'

export function ClusterProtectBadge({
  isProtected,
  ...props
}: ComponentProps<typeof CheckedShieldIcon> & {
  isProtected: Nullable<boolean>
}) {
  if (!isProtected) {
    return null
  }

  return (
    <Tooltip
      placement="top"
      label={CLUSTER_PROTECT_TT_TEXT}
    >
      <CheckedShieldIcon
        size={14}
        {...props}
      />
    </Tooltip>
  )
}
