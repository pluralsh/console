import { ReactNode } from 'react'

import { ChipList } from '@pluralsh/design-system'

import { V1_LabelSelector as LabelSelectorT } from '../../../generated/graphql-kubernetes'

interface LabelSelectorProps {
  selector: Nullable<LabelSelectorT>
}

export function LabelSelector({ selector }: LabelSelectorProps): ReactNode {
  return (
    <ChipList
      size="small"
      values={Object.entries(selector?.matchLabels ?? {})}
      transformValue={(label) => label.join(': ')}
      limit={3}
    />
  )
}
