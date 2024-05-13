import { Card } from '@pluralsh/design-system'
import React, { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { StackFragment, useStackRunsQuery } from '../../generated/graphql'
import { extendConnection, mapExistingNodes } from '../../utils/graphql'
import { StandardScroller } from '../utils/SmoothScroller'
import { ReturnToBeginning } from '../utils/ReturnToBeginning'

import StackRun from './StackRun'

export default function Stack({ stack }: { stack?: Nullable<StackFragment> }) {
  const theme = useTheme()
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)

  const { data, loading, fetchMore } = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
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

  return (
    <Card
      height="100%"
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
          <div css={{ height: 77, borderBottom: theme.borders.default }} />
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
          data?.infrastructureStack?.runs?.pageInfo.hasNextPage &&
          fetchMore({
            variables: { cursor: pageInfo?.endCursor },
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
