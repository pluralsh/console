import { ShieldOutlineIcon, Tooltip } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

export const PROTECT_TT_TEXT = (resource: 'cluster' | 'service' = 'cluster') =>
  `This ${resource} cannot be deleted until you disable delete protection`

export function ProtectBadge({
  isProtected,
  resource = 'cluster',
  ...props
}: ComponentProps<typeof ShieldOutlineIcon> & {
  isProtected: Nullable<boolean>
  resource: 'cluster' | 'service'
}) {
  if (!isProtected) {
    return null
  }

  return (
    <Tooltip
      placement="top"
      label={PROTECT_TT_TEXT(resource)}
    >
      <ShieldOutlineIcon
        size={16}
        {...props}
      />
    </Tooltip>
  )
}
