import { ReactNode } from 'react'

import { ChipList } from '@pluralsh/design-system'

import { V1_LabelSelector as LabelSelectorT } from '../../../generated/graphql-kubernetes'

interface LabelSelectorProps {
  selector: LabelSelectorT
}

export function LabelSelector({ selector }: LabelSelectorProps): ReactNode {
  return (
    <ChipList
      size="small"
      values={Object.entries(selector.matchLabels)}
      limit={3}
    />
  )
}
