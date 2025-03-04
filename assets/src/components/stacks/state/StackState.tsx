import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'

import { useStackStateQuery } from '../../../generated/graphql'
import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import LoadingIndicator from '../../utils/LoadingIndicator'

import { StackStateGraph } from './StackStateGraph'

export default function StackState() {
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'state' }],
      [stack]
    )
  )

  const { data, loading } = useStackStateQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id,
  })

  if (loading) return <LoadingIndicator />

  const state = data?.infrastructureStack?.state

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
