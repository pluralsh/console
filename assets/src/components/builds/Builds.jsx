import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useQuery } from 'react-apollo'

import { Box, Stack, Text } from 'grommet'

import { Flex } from 'honorable'

import { PageTitle } from '@pluralsh/design-system'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { Up } from 'grommet-icons'

import { appendConnection, extendConnection } from '../../utils/graphql'

import { BUILDS_Q, BUILD_SUB } from '../graphql/builds'

import { BreadcrumbsContext } from '../Breadcrumbs'
import { BuildIcons } from '../types'

import { LoopingLogo } from '../utils/AnimatedLogo'
import { StandardScroller } from '../utils/SmoothScroller'

import { PinnedRunbooks } from '../runbooks/PinnedRunbooks'

import { UpgradePolicies } from './UpgradePolicies'
import CreateBuild from './CreateBuild'
import Build from './Build'

export function BuildIcon({ build, size }) {
  const icon = BuildIcons[build.type]

  return (
    <Box
      flex={false}
      pad="small"
      background="cardDark"
    >
      {React.createElement(icon, { size: size || '15px' })}
    </Box>
  )
}

export const BUILD_PADDING = { horizontal: 'medium' }

const POLL_INTERVAL = 1000 * 30

function Placeholder() {
  return (
    <Box pad={BUILD_PADDING}>
      <Box
        height="90px"
        color=""
        background="card"
        margin={{ top: 'small' }}
        round="xsmall"
      />
    </Box>
  )
}

export function ReturnToBeginning({ beginning }) {
  return (
    <Box
      direction="row"
      align="center"
      round="xsmall"
      gap="small"
      hoverIndicator="cardHover"
      background="card"
      margin={{ bottom: 'medium', horizontal: 'small' }}
      pad="small"
      focusIndicator={false}
      onClick={beginning}
    >
      <Box
        direction="row"
        fill="horizontal"
        justify="center"
      >
        <Text size="small">go to most recent</Text>
      </Box>
      <Up size="15px" />
    </Box>
  )
}

export const HEADER_HEIGHT = '60px'

export default function Builds() {
  const [listRef, setListRef] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const {
    data, loading, subscribeToMore, fetchMore,
  } = useQuery(BUILDS_Q, {
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useEffect(() => setBreadcrumbs([{ text: 'Builds', url: '/builds' }]), [setBreadcrumbs])

  useEffect(() => subscribeToMore({
    document: BUILD_SUB,
    updateQuery: (prev, { subscriptionData: { data: { buildDelta: { delta, payload } } } }) => (delta === 'CREATE' ? appendConnection(prev, payload, 'builds') : prev),
  }), [])

  const returnToBeginning = useCallback(() => listRef.scrollToItem(0), [listRef])

  if (loading && !data) {
    return (
      <LoopingLogo
        scale="0.75"
        dark
      />
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
      <ResponsiveLayoutContentContainer>
        <PageTitle heading="Builds">
          <Flex grow={1} />
          <UpgradePolicies />
          <CreateBuild />
        </PageTitle>
        <PinnedRunbooks />
        <Stack
          fill
          anchor="bottom-left"
        >
          <Box
            fill
            pad={{ vertical: 'small' }}
          >
            <StandardScroller
              listRef={listRef}
              setListRef={setListRef}
              items={edges}
              loading={loading}
              handleScroll={setScrolled}
              placeholder={Placeholder}
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
            />
          </Box>
          {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
        </Stack>
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
