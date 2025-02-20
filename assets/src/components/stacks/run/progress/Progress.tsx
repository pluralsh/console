import { Card } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import sortBy from 'lodash/sortBy'

import { RunStep, StepStatus } from '../../../../generated/graphql'

import Step from './Step'
import { StackRunOutletContextT } from '../Route.tsx'

function currentStep(steps: Array<RunStep>): string {
  for (let i = steps.length - 1; i > 0; i--) {
    const { status } = steps[i]

    if (
      status === StepStatus.Running ||
      status === StepStatus.Successful ||
      status === StepStatus.Failed
    ) {
      return steps[i].id
    }
  }

  return steps[0]?.id
}

export default function StackRunProgress(): ReactNode {
  const { stackRun } = useOutletContext<StackRunOutletContextT>()
  const sorted = useMemo(
    () => sortBy(stackRun.steps, (s) => s?.index),
    [stackRun.steps]
  )
  const openId = currentStep(sorted as Array<RunStep>)

  return (
    <ScrollablePage
      scrollable={false}
      noPadding
    >
      <Card
        flexGrow={1}
        overflowY="auto"
        maxHeight="100%"
      >
        {sorted?.map((s) => (
          <Step
            key={s!.id}
            step={s!}
            open={s!.id === openId}
          />
        ))}
      </Card>
    </ScrollablePage>
  )
}
