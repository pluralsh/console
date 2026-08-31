import { EmptyState } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'

import { StackStateGraph } from 'components/stacks/state/StackStateGraph'
import { ReactFlowProvider } from '@xyflow/react'

import { StackRun } from '../../../../generated/graphql'

export default function StackRunState(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const { state } = stackRun

  return (
    <div css={{ height: '100%' }}>
      {state ? (
        <ReactFlowProvider>
          <StackStateGraph state={state} />
        </ReactFlowProvider>
      ) : (
        <EmptyState message="No state found." />
      )}
    </div>
  )
}
