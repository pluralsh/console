import { Date } from '@pluralsh/design-system'

import { TooltipTime } from '../TooltipTime'

export function DateTimeCol({ date }: { date: string | null | undefined }) {
  if (!date) {
    return null
  }

  return (
    <TooltipTime date={date}>
      <Date date={date} />
    </TooltipTime>
  )
}
