import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { useStackStateQuery } from '../../../generated/graphql'
import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import { StackStateGraph } from './StackStateGraph'

export default function StackState() {
  const { stack } = useOutletContext() as StackOutletContextT

  const { data } = useStackStateQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id,
  })

  const state = data?.infrastructureStack?.state

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id ?? ''), { label: 'state' }],
      [stack.id]
    )
  )

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
