import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useQuery } from '@apollo/client'

import { Flex } from 'honorable'

import { Card, LoopingLogo, PageTitle } from '@pluralsh/design-system'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { ReturnToBeginning } from 'components/utils/ReturnToBeginning'

import { appendConnection, extendConnection } from '../../utils/graphql'

import { BUILDS_Q, BUILD_SUB } from '../graphql/builds'

import { BreadcrumbsContext } from '../Breadcrumbs'

import { StandardScroller } from '../utils/SmoothScroller'

import { UpgradePolicies } from './UpgradePolicies'
import CreateBuild from './CreateBuild'
import Build from './Build'

export const BUILD_PADDING = { horizontal: 'medium' }

const POLL_INTERVAL = 1000 * 30

export const HEADER_HEIGHT = '60px'

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

  useEffect(() => setBreadcrumbs([{ text: 'builds', url: '/builds' }]), [setBreadcrumbs])

  useEffect(() => subscribeToMore({
    document: BUILD_SUB,
    updateQuery: (prev, { subscriptionData: { data: { buildDelta: { delta, payload } } } }) => (delta === 'CREATE' ? appendConnection(prev, payload, 'builds') : prev),
  }), [subscribeToMore])

  const returnToBeginning = useCallback(() => listRef.scrollToItem(0), [listRef])

  if (loading && !data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const { edges, pageInfo } = data.builds

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
      position="relative"
    >
      <ResponsiveLayoutSidenavContainer width={240} />
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer overflowY="hidden">
        <PageTitle
          heading="Builds"
          gap="small"
        >
          <Flex grow={1} />
          <UpgradePolicies />
          <CreateBuild />
        </PageTitle>
        {/* <PinnedRunbooks border={undefined} /> */}
        <Card flexGrow="1">
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
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
