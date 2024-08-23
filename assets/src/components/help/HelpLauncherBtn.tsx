import { Merge } from 'type-fest'
import {
  CaretDownIcon,
  IconFrame,
  IconFrameProps,
} from '@pluralsh/design-system'

import { CountBadge } from './CountBadge'

export function HelpLauncherBtn({
  variant,
  count = 0,
  ...props
}: Merge<
  Omit<IconFrameProps, 'icon'>,
  { variant: 'help' | 'minimize'; count?: number }
>) {
  const translate = count > 10 ? -7 : -6

  return (
    <div css={{ position: 'relative' }}>
      <IconFrame
        clickable
        type="secondary"
        icon={variant === 'minimize' ? <CaretDownIcon /> : <span>?</span>}
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
    </div>
  )
}
