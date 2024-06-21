import {
  Card,
  EmptyState,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { isEmpty } from 'lodash'
import { useOutletContext, useParams } from 'react-router-dom'

import { StackFragment, useStackRunsQuery } from '../../../generated/graphql'
import { ScrollablePage } from '../../utils/layout/ScrollablePage'

import { getBreadcrumbs } from '../Stacks'

import { StackRunsScroller } from './StackRunsScroller'

const pollInterval = 5 * 1000

export default function StackRuns() {
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as { stack?: Nullable<StackFragment> }

  useSetBreadcrumbs(
    useMemo(() => [...getBreadcrumbs(stackId), { label: 'runs' }], [stackId])
  )

  const queryResult = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval,
  })

  if (!queryResult.data) {
    return <LoopingLogo />
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
