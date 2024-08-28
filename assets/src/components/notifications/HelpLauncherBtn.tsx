import { Merge } from 'type-fest'
import {
  CaretDownIcon,
  IconFrame,
  IconFrameProps,
} from '@pluralsh/design-system'

import { CountBadge } from './CountBadge'

export function HelpLauncherBtn({
  open,
  count = 0,
  ...props
}: Merge<Omit<IconFrameProps, 'icon'>, { open?: boolean; count?: number }>) {
  const translate = count > 10 ? -7 : -6

  return (
    <div css={{ position: 'relative' }}>
      <IconFrame
        clickable
        type="secondary"
        icon={open ? <CaretDownIcon /> : <span>?</span>}
        tooltip={open ? undefined : 'Help'}
        {...props}
      />
      {count > 0 && !open && (
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
