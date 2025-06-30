import { Card, EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { isEmpty } from 'lodash'
import { useOutletContext } from 'react-router-dom'

import { useStackRunsQuery } from '../../../generated/graphql'
import { ScrollablePage } from '../../utils/layout/ScrollablePage'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import { StackRunsScroller } from './StackRunsScroller'

export default function StackRuns() {
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'runs' }],
      [stack]
    )
  )

  const queryResult = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: 2_000,
  })

  if (!queryResult.data) {
    return null
  }

  if (isEmpty(queryResult.data.infrastructureStack?.runs))
    return (
      <EmptyState message="Looks like this stack doesn't have any runs yet." />
    )

  return (
    <ScrollablePage
      scrollable={false}
      noPadding
    >
      <Card height="100%">
        <StackRunsScroller queryResult={queryResult} />
      </Card>
    </ScrollablePage>
  )
}
