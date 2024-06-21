import { StandardScroller } from 'components/utils/SmoothScroller'
import { StackRunsQueryResult } from 'generated/graphql'

import { ReturnToBeginning } from 'components/utils/ReturnToBeginning'
import { extendConnection, mapExistingNodes } from 'utils/graphql'

import { isEmpty } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { CSSObject, useTheme } from 'styled-components'

import StackRunsEntry from './StackRunsEntry'

export function StackRunsScroller({
  queryResult,
  entryStyles,
}: {
  queryResult: StackRunsQueryResult
  entryStyles?: CSSObject
}) {
  const theme = useTheme()
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const returnToBeginning = useCallback(
    () => listRef.scrollToItem(0),
    [listRef]
  )

  const { data, loading, fetchMore } = queryResult

  const { runs, pageInfo } = useMemo(
    () => ({
      runs: mapExistingNodes(data?.infrastructureStack?.runs),
      pageInfo: data?.infrastructureStack?.runs?.pageInfo,
    }),
    [data?.infrastructureStack?.runs]
  )

  return (
    <>
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
              entryStyles={entryStyles}
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
    </>
  )
}
