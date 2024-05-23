import { Card } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import sortBy from 'lodash/sortBy'

import { StackRun } from '../../../../../generated/graphql'

import Step from './Step'

export default function StackRunProgress(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const sorted = useMemo(
    () => sortBy(stackRun.steps, (s) => s?.index),
    [stackRun.steps]
  )

  return (
    <ScrollablePage
      scrollable={false}
      heading="Progress"
      noPadding
    >
      <Card
        flexGrow={1}
        fontFamily="Monument Mono"
        overflowY="auto"
        maxHeight="100%"
      >
        {sorted?.map((s) => (
          <Step
            key={s!.id}
            step={s!}
          />
        ))}
      </Card>
    </ScrollablePage>
  )
}
