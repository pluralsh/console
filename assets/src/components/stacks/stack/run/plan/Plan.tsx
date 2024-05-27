import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'

import CommandLog from 'components/builds/build/progress/CommandLog'
import { Card } from '@pluralsh/design-system'

import { StackRun } from '../../../../../generated/graphql'

export default function StackRunPlan(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const value = stackRun.state?.plan ?? ''

  return (
    <Card
      flexGrow={1}
      fontFamily="Monument Mono"
      overflowY="auto"
      maxHeight="100%"
    >
      <CommandLog
        text={value}
        follow={false}
      />
    </Card>
  )
}
