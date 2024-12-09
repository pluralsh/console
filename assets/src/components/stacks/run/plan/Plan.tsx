import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'

import CommandLog from '../../../utils/CommandLog.tsx'
import { Card } from '@pluralsh/design-system'

import { StackRunOutletContextT } from '../Route.tsx'

export default function StackRunPlan(): ReactNode {
  const { stackRun } = useOutletContext<StackRunOutletContextT>()
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
