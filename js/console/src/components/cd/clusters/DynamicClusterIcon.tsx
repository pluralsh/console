import {
  ClusterIcon,
  IconFrame,
  ManagementClusterIcon,
  ShieldLockIcon,
  Spinner,
  toFillLevel,
  useFillLevel,
  VirtualClusterIcon,
} from '@pluralsh/design-system'
import { ComponentProps, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'

import {
  fillLevelToBackground,
  fillLevelToBorderColor,
} from 'components/utils/FillLevelDiv'
import { PROTECT_TT_TEXT } from './ProtectBadge'

type DynamicClusterIconProps = {
  deleting?: boolean
  upgrading?: boolean
  protect?: boolean
  self?: boolean
  virtual?: boolean
  type?: ComponentProps<typeof IconFrame>['type']
  fillLevel?: number
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
  fillLevel: fillLevelProp,
}: DynamicClusterIconProps) {
  const { colors } = useTheme()
  const inferredFillLevel = useFillLevel()
  const fillLevel = fillLevelProp ?? inferredFillLevel

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
        css={{
          background: colors[fillLevelToBackground[toFillLevel(fillLevel)]],
          borderColor: colors[fillLevelToBorderColor[toFillLevel(fillLevel)]],
        }}
        size="medium"
        type={type}
        tooltip={tooltip}
        icon={
          pending ? (
            <Spinner
              color={deleting ? colors['icon-danger'] : colors['icon-info']}
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
