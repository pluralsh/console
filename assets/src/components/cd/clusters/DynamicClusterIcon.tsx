import { ReactElement, useMemo } from 'react'
import {
  CheckedShieldIcon,
  ClusterIcon,
  Spinner,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

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
    () => deleting || upgrading || protect,
    [deleting, upgrading, protect]
  )
  const tooltip = useMemo(() => {
    if (deleting) return 'Cluster is being deleted'
    if (upgrading) return 'Cluster is being upgraded'
    if (protect) return 'Cluster is protected from deletion'

    return ''
  }, [deleting, upgrading, protect])
  const pending = useMemo(() => deleting || upgrading, [deleting, upgrading])

  return (
    <WrapWithIf
      condition={condition}
      wrapper={<Tooltip label={tooltip} />}
    >
      <div
        css={{
          display: 'flex',
          position: 'relative',
        }}
      >
        {pending && (
          <Spinner
            style={{
              width: 16,
              height: 16,
            }}
            size={16}
            color={
              deleting ? theme.colors['icon-danger'] : theme.colors['icon-info']
            }
          />
        )}
        {!pending && !self && <ClusterIcon size={16} />}
        {!pending && self && (
          <ClusterIcon
            color={theme.colors['icon-success']}
            size={16}
          />
        )}
        {protect && (
          <CheckedShieldIcon
            css={{
              position: 'absolute',
              bottom: 0,
              right: 0,
            }}
            size={12}
            margin={-4}
          />
        )}
      </div>
    </WrapWithIf>
  )
}
