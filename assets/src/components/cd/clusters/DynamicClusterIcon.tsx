import { ReactElement, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ClusterIcon,
  IconFrame,
  ManagementClusterIcon,
  ShieldLockIcon,
  Spinner,
} from '@pluralsh/design-system'

import { PROTECT_TT_TEXT } from './ProtectBadge'

interface DynamicClusterIconProps {
  deleting?: boolean
  upgrading?: boolean
  protect?: boolean
  self?: boolean
}

const DynamicClusterIconSC = styled.div((_) => ({
  position: 'relative',
}))
const ProtectedIconSC = styled(ShieldLockIcon).attrs(() => ({ size: 14 }))(
  (_) => ({
    position: 'absolute',
    top: -7,
    right: -5,
    pointerEvents: 'none',
  })
)

export function DynamicClusterIcon({
  deleting = false,
  upgrading = false,
  protect = false,
  self = false,
}: DynamicClusterIconProps): ReactElement {
  const theme = useTheme()

  const tooltip = useMemo(() => {
    if (deleting) return 'Cluster is being deleted'
    if (upgrading) return 'Cluster is being upgraded'
    if (self) return 'Management cluster'
    if (protect) return PROTECT_TT_TEXT('cluster')

    return ''
  }, [deleting, upgrading, protect, self])
  const pending = useMemo(() => deleting || upgrading, [deleting, upgrading])

  return (
    <DynamicClusterIconSC>
      <IconFrame
        size="medium"
        type="secondary"
        tooltip={tooltip}
        icon={
          pending ? (
            <Spinner
              color={
                deleting
                  ? theme.colors['icon-danger']
                  : theme.colors['icon-info']
              }
            />
          ) : self ? (
            <ManagementClusterIcon />
          ) : (
            <ClusterIcon />
          )
        }
      />
      {(protect || self) && <ProtectedIconSC />}
    </DynamicClusterIconSC>
  )
}
