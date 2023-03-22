import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useQuery } from '@apollo/client'
import { Flex } from 'honorable'
import { Card } from '@pluralsh/design-system'
import { ReturnToBeginning } from 'components/utils/ReturnToBeginning'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { appendConnection, extendConnection } from '../../utils/graphql'
import { BUILDS_Q, BUILD_SUB } from '../graphql/builds'
import { BreadcrumbsContext } from '../layout/Breadcrumbs'
import { StandardScroller } from '../utils/SmoothScroller'

import { UpgradePolicies } from './UpgradePolicies'
import CreateBuild from './CreateBuild'
import Build from './Build'

const POLL_INTERVAL = 1000 * 30

export default function Builds() {
  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const {
    data, loading, subscribeToMore, fetchMore,
  } = useQuery(BUILDS_Q, {
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useEffect(() => setBreadcrumbs([{ text: 'builds', url: '/builds' }]),
    [setBreadcrumbs])

  useEffect(() => subscribeToMore({
    document: BUILD_SUB,
    updateQuery: (prev,
      {
        subscriptionData: {
          data: {
            buildDelta: { delta, payload },
          },
        },
      }) => (delta === 'CREATE' ? appendConnection(prev, payload, 'builds') : prev),
  }),
  [subscribeToMore])

  const returnToBeginning = useCallback(() => listRef.scrollToItem(0),
    [listRef])

  if (loading && !data) return <LoadingIndicator />

  const { edges, pageInfo } = data.builds

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading="Builds"
      gap="small"
      headingContent={(
        <>
          <Flex grow={1} />
          <UpgradePolicies />
          <CreateBuild />
        </>
      )}
    >
      {/* <PinnedRunbooks border={undefined} /> */}
      <Card height="100%">
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          loading={loading}
          handleScroll={setScrolled}
          placeholder={() => (
            <Flex
              height={77}
              borderBottom="1px solid border"
            />
          )}
          hasNextPage={pageInfo.hasNextPage}
          mapper={({ node }) => (
            <Build
              key={node.id}
              build={node}
            />
          )}
          loadNextPage={() => pageInfo.hasNextPage && fetchMore({
            variables: { cursor: pageInfo.endCursor },
            updateQuery: (prev, { fetchMoreResult: { builds } }) => extendConnection(prev, builds, 'builds'),
          })}
          refreshKey={undefined}
          setLoader={undefined}
        />
        {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
      </Card>
    </ResponsivePageFullWidth>
  )
}
