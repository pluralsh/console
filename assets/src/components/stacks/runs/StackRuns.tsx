import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

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
    <Flex
      direction="column"
      minHeight={0}
    >
      <StackRunsTable
        variables={{ id: stack?.id ?? '' }}
        options={{ pollInterval: 2_000 }}
      />
    </Flex>
  )
}
