import { useContext, useEffect, useMemo, useRef } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import { appendEdge } from 'components/graphql/utils'

import { BUILD_Q, BUILD_SUB, COMMAND_SUB } from 'components/graphql/builds'

import '../../build.css'

import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'

import {
  AppIcon,
  InstallIcon,
  Prop,
  PropsContainer,
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'

import { Flex, H2, P } from 'honorable'

import { getIcon, hasIcons } from 'components/apps/misc'

import { InstallationContext } from 'components/Installations'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import { deepUpdate } from 'utils/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { BUILD_TYPE_DISPLAY_NAMES } from '../Build'

import { BuildTimer } from './BuildTimer'
import BuildCancel from './BuildCancel'
import BuildRestart from './BuildRestart'
import BuildApproval from './BuildApproval'

const UPDATE_PATH = 'build.commands.edges'.split('.')

function updateQuery(prev, { subscriptionData: { data } }) {
  if (!data) return prev
  const {
    commandDelta: { delta, payload },
  } = data

  if (delta === 'CREATE') {
    return deepUpdate(prev, UPDATE_PATH, (edges) =>
      appendEdge(edges, payload, 'append')
    )
  }

  return prev
}

const DIRECTORY = [
  { path: 'progress', label: 'Progress' },
  { path: 'changelog', label: 'Changelog' },
]

export default function Build() {
  const tabStateRef = useRef<any>(null)
  const { applications } = useContext<any>(InstallationContext)
  const { pathname } = useLocation()
  const { buildId } = useParams()
  const pathPrefix = `/builds/${buildId}`
  const { data, subscribeToMore } = useQuery(BUILD_Q, {
    variables: { buildId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
  })
  const breadcrumbs = useMemo(
    () => [
      { label: 'builds', url: '/builds' },
      { label: buildId ?? '', url: `/builds/${buildId}` },
    ],
    [buildId]
  )

  useSetBreadcrumbs(breadcrumbs)

  useEffect(() => {
    const first = subscribeToMore({
      document: COMMAND_SUB,
      variables: { buildId },
      updateQuery,
    })
    const second = subscribeToMore({
      document: BUILD_SUB,
      variables: { buildId },
    })

    return () => {
      first()
      second()
    }
  }, [buildId, subscribeToMore])

  const app = useMemo(
    () => applications?.find((app) => app.name === data?.build?.repository),
    [applications, data?.build?.repository]
  )

  if (!data) return <LoadingIndicator />

  const {
    commands: { edges },
    creator,
    approver,
    ...build
  } = data.build
  const directory =
    build.changelogs?.length > 0
      ? DIRECTORY
      : DIRECTORY.filter(({ path }) => path !== 'changelog')
  const currentTab = directory.find(
    (tab) => pathname?.startsWith(`${pathPrefix}/${tab.path}`)
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <Flex
          align="center"
          gap="small"
          marginBottom="large"
        >
          {app && hasIcons(app) && (
            <AppIcon
              url={getIcon(app)}
              size="small"
            />
          )}
          {!app && (
            <AppIcon
              icon={<InstallIcon />}
              size="small"
            />
          )}
          <div>
            <H2
              fontSize="20px"
              fontWeight="500"
              lineHeight="24px"
            >
              {build.repository}
            </H2>
            <P
              color="text-xlight"
              caption
            >
              {build.message}
            </P>
          </div>
        </Flex>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {directory.map(({ label, path }) => (
            <Tab
              key={path}
              as={Link}
              to={path}
              textDecoration="none"
            >
              {label}
            </Tab>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer />}
        stateRef={tabStateRef}
      >
        <Outlet context={{ edges, build }} />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer>
        <Flex
          direction="column"
          gap="xsmall"
          marginBottom="xsmall"
        >
          <BuildApproval build={build} />
          <BuildRestart build={build} />
          <BuildCancel build={build} />
        </Flex>
        <Flex
          gap="medium"
          direction="column"
          paddingTop="xsmall"
        >
          <PropsContainer>
            <Prop title="Status">
              <BuildTimer
                insertedAt={build.insertedAt}
                completedAt={build.completedAt}
                status={build.status}
              />
            </Prop>
            <Prop title="App">{build.repository}</Prop>
            <Prop title="Build type">
              {BUILD_TYPE_DISPLAY_NAMES[build.type] || build.type}
            </Prop>
            <Prop title="ID">{buildId}</Prop>
            {creator && (
              <Prop
                title="Creator"
                display="flex"
                gap="xsmall"
              >
                <AppIcon
                  size="xxsmall"
                  name={creator.name}
                />
                <Flex align="center">{creator.email}</Flex>
              </Prop>
            )}
            {approver && (
              <Prop
                title="Approver"
                display="flex"
                gap="xsmall"
              >
                <AppIcon
                  size="xxsmall"
                  name={approver.name}
                />
                <Flex align="center">{approver.email}</Flex>
              </Prop>
            )}
          </PropsContainer>
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
