import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-apollo'

import { Check } from 'forge-core'

import { Box, Stack, Text } from 'grommet'

import moment from 'moment'

import { BeatLoader } from 'react-spinners'

import { Close, StatusCritical, Up } from 'grommet-icons'

import { Flex } from 'honorable'

import { PageTitle } from '@pluralsh/design-system'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { appendConnection, extendConnection } from '../../utils/graphql'

import { BUILDS_Q, BUILD_SUB } from '../graphql/builds'

import { BreadcrumbsContext } from '../Breadcrumbs'
import { BuildIcons, BuildStatus as Status } from '../types'

import { LoopingLogo } from '../utils/AnimatedLogo'
import { StandardScroller } from '../utils/SmoothScroller'

import { PinnedRunbooks } from '../runbooks/PinnedRunbooks'
import { Container } from '../utils/Container'

import { UpgradePolicies } from './UpgradePolicies'
import CreateBuild from './CreateBuild'

function BuildStatusInner({ background, text, icon }) {
  return (
    <Box
      flex={false}
      direction="row"
      justify="center"
      align="center"
      pad={{ horizontal: 'small', vertical: 'xsmall' }}
      round="xxsmall"
      background={background}
    >
      {icon && <Box width="50px">{icon}</Box>}
      <Text
        size="small"
        weight={500}
      >{text}
      </Text>
    </Box>
  )
}

function IconStatus({ icon, background }) {
  return (
    <Box
      flex={false}
      round="full"
      width="30px"
      height="30px"
      align="center"
      justify="center"
      background={background}
    >
      {React.createElement(icon, { size: '16px' })}
    </Box>
  )
}

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

function BuildStatus({ status }) {
  switch (status) {
  case Status.QUEUED:
    return (
      <BuildStatusInner
        background="status-unknown"
        text="queued"
      />
    )
  case Status.CANCELLED:
    return (
      <IconStatus
        icon={Close}
        background="tone-medium"
      />
    )
  case Status.RUNNING:
    return (
      <BuildStatusInner
        icon={(
          <BeatLoader
            size={5}
            margin={2}
            color="white"
          />
        )}
        background="progress"
        text="running"
      />
    )
  case Status.FAILED:
    return (
      <IconStatus
        icon={StatusCritical}
        background="error"
      />
    )
  case Status.SUCCESSFUL:
    return (
      <IconStatus
        icon={Check}
        background="success"
      />
    )
  case Status.PENDING:
    return (
      <BuildStatusInner
        background="status-warning"
        text="pending approval"
      />
    )
  default:
    return null
  }
}

export const BUILD_PADDING = { horizontal: 'medium' }

function Build({ build }) {
  const {
    id, repository, status, insertedAt, message, creator, sha,
  } = build
  const navigate = useNavigate()

  return (
    <Box pad={BUILD_PADDING}>
      <Container
        onClick={() => navigate(`/builds/${id}`)}
        margin={{ bottom: 'small' }}
      >
        <BuildIcon build={build} />
        <Box fill="horizontal">
          <Text
            size="small"
            weight="bold"
          >{repository}
          </Text>
          <Box
            direction="row"
            align="center"
            gap="xsmall"
          >
            <Box flex={false}>
              <Text
                size="small"
                color="dark-6"
              >{moment(insertedAt).fromNow()} -- {creator && creator.name} --
              </Text>
            </Box>
            <Box style={{ maxWidth: '100%' }}>
              <Text
                size="small"
                color="dark-6"
                truncate
              >{message}
              </Text>
            </Box>
            <Box flex={false}>
              <Text
                size="small"
                color="dark-6"
              >-- {sha}
              </Text>
            </Box>
          </Box>
        </Box>
        <Box margin={{ left: 'small' }}>
          <BuildStatus status={status} />
        </Box>
      </Container>
    </Box>
  )
}

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
