import { ComponentProps, ReactElement, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ClusterIcon,
  IconFrame,
  ManagementClusterIcon,
  ShieldLockIcon,
  Spinner,
  VirtualClusterIcon,
} from '@pluralsh/design-system'

import { PROTECT_TT_TEXT } from './ProtectBadge'

interface DynamicClusterIconProps {
  deleting?: boolean
  upgrading?: boolean
  protect?: boolean
  self?: boolean
  virtual?: boolean
  type?: ComponentProps<typeof IconFrame>['type']
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
  virtual = false,
  type = 'secondary',
}: DynamicClusterIconProps): ReactElement<any> {
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
        background="fill-two"
        size="medium"
        type={type}
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
          ) : virtual ? (
            <VirtualClusterIcon fullColor={false} />
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
