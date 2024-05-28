import {
  Card,
  EmptyState,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'

import { useOutletContext, useParams } from 'react-router-dom'

import { StackFragment, useStackRunsQuery } from '../../../generated/graphql'
import { extendConnection, mapExistingNodes } from '../../../utils/graphql'
import { StandardScroller } from '../../utils/SmoothScroller'
import { ReturnToBeginning } from '../../utils/ReturnToBeginning'

import ConsolePageTitle from '../../utils/layout/ConsolePageTitle'

import { getBreadcrumbs } from '../Stacks'

import StackRun from './StackRun'

const pollInterval = 5 * 1000

export default function StackRuns() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as { stack?: Nullable<StackFragment> }
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)

  useSetBreadcrumbs(
    useMemo(() => [...getBreadcrumbs(stackId), { label: 'runs' }], [stackId])
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

  if (!data) {
    return <LoopingLogo />
  }

  if (isEmpty(runs))
    return (
      <EmptyState message="Looks like this stack doesn't have any runs yet." />
    )

  return (
    <>
      <ConsolePageTitle
        heading="Runs"
        headingProps={{
          paddingTop: theme.spacing.small,
          paddingBottom: theme.spacing.medium,
        }}
      />
      <Card
        // TODO: Height should be max content.
        height="calc(100% - 52px)"
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
              <StackRun
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
    </>
  )
}
