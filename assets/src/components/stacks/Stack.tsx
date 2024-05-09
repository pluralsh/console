import { Card } from '@pluralsh/design-system'

import React, { useCallback, useMemo, useState } from 'react'

import { useTheme } from 'styled-components'

import { StackFragment, useStackRunsQuery } from '../../generated/graphql'
import {} from '../../routes/kubernetesRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'

import { StandardScroller } from '../utils/SmoothScroller'
import { ReturnToBeginning } from '../utils/ReturnToBeginning'

import StackRun from './StackRun'

export default function Stack({ stack }: { stack?: Nullable<StackFragment> }) {
  const theme = useTheme()
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)

  // TODO: Add pagination.
  const { data, loading } = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
  })

  const runs = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.runs),
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
        hasNextPage={data?.infrastructureStack?.runs?.pageInfo.hasNextPage}
        mapper={(run) => (
          <StackRun
            key={run.id}
            stackRun={run}
          />
        )}
        loadNextPage={null}
        // loadNextPage={() =>
        //   data?.infrastructureStack?.runs?.pageInfo.hasNextPage &&
        //   fetchMore({
        //     variables: { cursor: data?.infrastructureStack?.runs?.pageInfo.endCursor },
        //     updateQuery: (prev, { fetchMoreResult: { infrastructureStack } }) =>
        //       extendConnection(prev, builds, 'builds'),
        //   })
        // }
        refreshKey={undefined}
        setLoader={undefined}
      />
      {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
    </Card>
  )
}
