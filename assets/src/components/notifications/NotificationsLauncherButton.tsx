import { Merge } from 'type-fest'
import {
  IconFrame,
  IconFrameProps,
  LightningIcon,
} from '@pluralsh/design-system'

import { CountBadge } from '../utils/CountBadge'

export function NotificationsLauncherButton({
  open,
  count = 0,
  ...props
}: Merge<Omit<IconFrameProps, 'icon'>, { open?: boolean; count?: number }>) {
  const translate = count > 10 ? -7 : -6

  return (
    <div css={{ position: 'relative' }}>
      <IconFrame
        clickable
        icon={<LightningIcon />}
        tooltip={open ? undefined : `You have ${count} notifications`}
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
