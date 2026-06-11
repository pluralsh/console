import {
  ClipboardChecked,
  IconFrame,
  IconFrameProps,
} from '@pluralsh/design-system'
import { Merge } from 'type-fest'
import { CountBadge } from '../utils/CountBadge'

export function AwaitingReviewLauncherButton({
  open,
  count = 0,
  ...props
}: Merge<Omit<IconFrameProps, 'icon'>, { open?: boolean; count?: number }>) {
  const translate = count > 10 ? -6 : -5

  return (
    <div css={{ position: 'relative', marginRight: count > 0 ? 6 : 0 }}>
      <IconFrame
        clickable
        icon={<ClipboardChecked />}
        tooltip={
          open
            ? undefined
            : count > 0
              ? `${count} stack${count === 1 ? '' : 's'} awaiting review`
              : 'No stacks awaiting review'
        }
        {...props}
      />
      {count > 0 && (
        <CountBadge
          variant="warning"
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
