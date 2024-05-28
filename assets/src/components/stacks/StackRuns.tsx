import {
  Card,
  EmptyState,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'

import { useOutletContext } from 'react-router-dom'

import { useStackRunsQuery } from '../../generated/graphql'
import { extendConnection, mapExistingNodes } from '../../utils/graphql'
import { StandardScroller } from '../utils/SmoothScroller'
import { ReturnToBeginning } from '../utils/ReturnToBeginning'

import { StackOutletContextT, getBreadcrumbs } from './Stacks'

import StackRunsEntry from './StackRunsEntry'

const pollInterval = 5 * 1000

export default function StackRuns() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id ?? ''), { label: 'runs' }],
      [stack.id]
    )
  )

  const { data, loading, fetchMore } = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval,
  })

  const { runs, pageInfo } = useMemo(
    () => ({
      runs: mapExistingNodes(data?.infrastructureStack?.runs),
      pageInfo: data?.infrastructureStack?.runs?.pageInfo,
    }),
    [data?.infrastructureStack?.runs]
  )

  const returnToBeginning = useCallback(
    () => listRef.scrollToItem(0),
    [listRef]
  )

  if (!data) return <LoopingLogo />

  if (isEmpty(runs))
    return <EmptyState message="Looks like there are no runs yet." />

  return (
    <Card
      // TODO: Height should be max content.
      height="calc(100% - 140px)"
      width="100%"
      position="relative"
    >
      <StandardScroller
        listRef={listRef}
        setListRef={setListRef}
        items={runs}
        loading={loading}
        handleScroll={setScrolled}
        placeholder={() => (
          <div css={{ height: 71, borderBottom: theme.borders.default }} />
        )}
        hasNextPage={pageInfo?.hasNextPage}
        mapper={(run, { next }) => (
          <div>
            <StackRunsEntry
              key={run.id}
              stackRun={run}
              first={isEmpty(next)}
            />
          </div>
        )}
        loadNextPage={() =>
          pageInfo?.hasNextPage &&
          fetchMore({
            variables: { after: pageInfo?.endCursor },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!prev.infrastructureStack) return prev

              return {
                ...prev,
                infrastructureStack: extendConnection(
                  prev.infrastructureStack,
                  fetchMoreResult.infrastructureStack?.runs,
                  'runs'
                ),
              }
            },
          })
        }
        refreshKey={undefined}
        setLoader={undefined}
      />
      {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
    </Card>
  )
}
