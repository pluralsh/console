import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-apollo'

import {
  Button,
  Check,
  Deploy,
  Reload,
} from 'forge-core'

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

import { appendConnection, extendConnection, updateCache } from '../../utils/graphql'

import { BUILDS_Q, BUILD_SUB, CREATE_BUILD } from '../graphql/builds'

import { BreadcrumbsContext } from '../Breadcrumbs'
import { BuildIcons, BuildTypes, BuildStatus as Status } from '../types'
import { InstallationContext } from '../Installations'

import { LoopingLogo } from '../utils/AnimatedLogo'
import { StandardScroller } from '../utils/SmoothScroller'

import { PinnedRunbooks } from '../runbooks/PinnedRunbooks'
import { Container } from '../utils/Container'
import { ErrorModal } from '../utils/ErrorModal'

import { UpgradePolicies } from './UpgradePolicies'

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

function CreateBuild() {
  const [type, setType] = useState(BuildTypes.DEPLOY)
  const { currentApplication } = useContext(InstallationContext)
  const baseAttrs = { repository: currentApplication.name, message: 'Deployed from console' }
  const [mutation, { loading, error }] = useMutation(CREATE_BUILD, {
    update: (cache, { data: { createBuild } }) => updateCache(cache, {
      query: BUILDS_Q,
      update: prev => appendConnection(prev, createBuild, 'builds'),
    }),
  })

  const deploy = useCallback(type => {
    setType(type)
    mutation({ variables: { attributes: { type, ...baseAttrs } } })
  }, [setType, mutation, baseAttrs])

  return (
    <>
      {error && (
        <ErrorModal
          error={error}
          modalHeader={`Failed to ${type.toLocaleLowerCase}} build`}
          header="This deployment action was not permitted"
        />
      )}
      <Box
        flex={false}
        gap="small"
        pad={{ horizontal: 'small' }}
        direction="row"
        align="center"
      >
        <Button
          icon={<Reload size="small" />}
          onClick={() => deploy(BuildTypes.BOUNCE)}
          background="card"
          flat
          label="Bounce"
          loading={loading && type === BuildTypes.BOUNCE}
        />
        <Button
          icon={<Check size="small" />}
          onClick={() => deploy(BuildTypes.APPROVAL)}
          background="card"
          flat
          label="Approval"
          loading={loading && type === BuildTypes.APPROVAL}
        />
        <Button
          icon={<Deploy size="small" />}
          onClick={() => deploy(BuildTypes.DEPLOY)}
          loading={loading && type === BuildTypes.DEPLOY}
          label="Deploy"
          background="brand"
          flat
        />
      </Box>
    </>
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
