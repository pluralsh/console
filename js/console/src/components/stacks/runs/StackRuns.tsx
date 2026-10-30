import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { STACK_DELTA_FALLBACK_POLL_INTERVAL } from '../common/useStackDeltas'
import { getBreadcrumbs, StackOutletContextT } from '../Stacks'

import { StackRunsTable } from './StackRunsTable'

export default function StackRuns() {
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'runs' }],
      [stack]
    )
  )

  return (
    <StackRunsTable
      variables={{ id: stack?.id ?? '' }}
      options={{
        pollInterval: STACK_DELTA_FALLBACK_POLL_INTERVAL,
        fetchPolicy: 'cache-and-network',
      }}
    />
  )
}
