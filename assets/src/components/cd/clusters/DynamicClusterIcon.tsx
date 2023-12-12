import { ReactElement, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  ClusterIcon,
  ManagementClusterIcon,
  ProtectedClusterIcon,
  Spinner,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'

import { PROTECT_TT_TEXT } from './ProtectBadge'

interface DynamicClusterIconProps {
  deleting?: boolean
  upgrading?: boolean
  protect?: boolean
  self?: boolean
}

export function DynamicClusterIcon({
  deleting = false,
  upgrading = false,
  protect = false,
  self = false,
}: DynamicClusterIconProps): ReactElement {
  const theme = useTheme()

  const condition = useMemo(
    () => deleting || upgrading || protect || self,
    [deleting, upgrading, protect, self]
  )
  const tooltip = useMemo(() => {
    if (deleting) return 'Cluster is being deleted'
    if (upgrading) return 'Cluster is being upgraded'
    if (self) return 'Management cluster'
    if (protect) return PROTECT_TT_TEXT('cluster')

    return ''
  }, [deleting, upgrading, protect, self])
  const pending = useMemo(() => deleting || upgrading, [deleting, upgrading])

  return (
    <WrapWithIf
      condition={condition}
      wrapper={
        <Tooltip
          label={tooltip}
          placement="top"
        />
      }
    >
      <div
        css={{
          display: 'flex',
        }}
      >
        {pending && (
          <Spinner
            size={16}
            color={
              deleting ? theme.colors['icon-danger'] : theme.colors['icon-info']
            }
          />
        )}
        {!pending && !self && protect && <ProtectedClusterIcon size={16} />}
        {!pending && !self && !protect && <ClusterIcon size={16} />}
        {!pending && self && <ManagementClusterIcon size={16} />}
      </div>
    </WrapWithIf>
  )
}
