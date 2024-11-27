import { Merge } from 'type-fest'
import {
  CaretLeftIcon,
  IconFrame,
  IconFrameProps,
  useSidebar,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { CountBadge } from '../utils/CountBadge'

export function HelpLauncherBtn({
  variant,
  count = 0,
  ...props
}: Merge<
  Omit<IconFrameProps, 'icon'>,
  { variant: 'help' | 'minimize'; count?: number }
>) {
  const theme = useTheme()
  const { isExpanded } = useSidebar()

  const translate = count > 10 ? -7 : -6

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xsmall,
        position: 'relative',
      }}
    >
      <IconFrame
        clickable
        type="secondary"
        icon={variant === 'minimize' ? <CaretLeftIcon /> : <span>?</span>}
        tooltip={variant === 'minimize' ? undefined : 'Help'}
        {...props}
      />
      {count > 0 && variant === 'help' && (
        <CountBadge
          size="medium"
          count={count}
          css={{
            position: 'absolute',
            top: translate,
            right: translate,
          }}
        />
      )}
      {isExpanded && 'Help'}
    </div>
  )
}
