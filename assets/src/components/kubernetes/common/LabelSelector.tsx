import { ReactNode } from 'react'

import { ChipList } from '@pluralsh/design-system'
import { V1LabelSelector } from 'generated/kubernetes'

export function LabelSelector({
  selector,
}: {
  selector?: V1LabelSelector
}): ReactNode {
  return (
    <ChipList
      size="small"
      values={Object.entries(selector?.matchLabels ?? {})}
      transformValue={(label) => label.join(': ')}
      limit={3}
    />
  )
}
