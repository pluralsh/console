import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'
import { useMutation, useQuery } from 'react-apollo'
import { ModalHeader } from 'forge-core'
import {
  Box,
  Layer,
  Text,
  ThemeContext,
} from 'grommet'

import { mergeEdges } from 'components/graphql/utils'

import {
  BUILD_Q,
  BUILD_SUB,
  CANCEL_BUILD,
  COMMAND_SUB,
} from 'components/graphql/builds'

import '../../build.css'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import {
  AppIcon,
  Button,
  LoopingLogo,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import {
  Div,
  Flex,
  H2,
  P,
} from 'honorable'

import { PropsContainer } from 'components/utils/PropsContainer'
import Prop from 'components/utils/Prop'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { getIcon, hasIcons } from 'components/apps/misc'

import { InstallationContext } from 'components/Installations'

import { BUILD_TYPE_DISPLAY_NAMES } from '../Build'

import { BuildTimer } from './BuildTimer'
import BuildRestart from './BuildRestart'
import BuildApproval from './BuildApproval'

export function OptionContainer({ children, ...props }) {
  return (
    <Box
      flex={false}
      pad={{ horizontal: 'medium' }}
      border="left"
      fill="vertical"
      justify="center"
      align="center"
      {...props}
    >
      {children}
    </Box>
  )
}

export function Cancel({ build: { id } }) {
  const [open, setOpen] = useState(false)
  const [mutation, { loading }] = useMutation(CANCEL_BUILD, { variables: { id } })

  return (
    <>
      <OptionContainer
        hoverIndicator="card"
        onClick={() => setOpen(true)}
      >
        <Text size="small">cancel</Text>
      </OptionContainer>
      {open && (
        <Layer modal>
          <Box width="40vw">
            <ModalHeader
              text="Are you sure you want to cancel this build?"
              setOpen={setOpen}
            />
            <Box
              direction="row"
              justify="end"
              pad="medium"
            >
              <Button
                label="Cancel"
                onClick={mutation}
                loading={loading}
              />
            </Box>
          </Box>
        </Layer>
      )}
    </>
  )
}

function updateQuery(prev, { subscriptionData: { data } }) {
  if (!data) return prev
  if (data.buildDelta) {
    return { ...prev, build: { ...prev, ...data.buildDelta.payload } }
  }

  const { commandDelta: { delta, payload } } = data
  const { commands: { edges, ...rest }, ...build } = prev.build

  return {
    ...prev,
    build: {
      ...build,
      commands: {
        ...rest,
        edges: mergeEdges(
          edges, delta, payload, 'CommandEdge', 'append'
        ),
      },
    },
  }
}

const DIRECTORY = [
  { path: 'progress', label: 'Progress' },
  { path: 'changelog', label: 'Changelog' },
]

export default function Build() {
  const tabStateRef = useRef<any>(null)
  const { dark } = useContext<any>(ThemeContext)
  const { applications } = useContext<any>(InstallationContext)
  const { pathname } = useLocation()
  const { buildId } = useParams()
  const pathPrefix = `/builds/${buildId}`
  const { data, subscribeToMore } = useQuery(BUILD_Q,
    { variables: { buildId }, fetchPolicy: 'cache-and-network', errorPolicy: 'ignore' })
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Builds', url: '/builds' },
      { text: buildId, url: `/builds/${buildId}` },
    ])

    const first = subscribeToMore({ document: COMMAND_SUB, variables: { buildId }, updateQuery })
    const second = subscribeToMore({ document: BUILD_SUB, variables: { buildId }, updateQuery })

    return () => {
      first()
      second()
    }
  }, [buildId, subscribeToMore, setBreadcrumbs])

  const app = useMemo(() => applications?.find(app => app.name === data?.build?.repository),
    [applications, data?.build?.repository])

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const {
    commands: { edges }, creator, approver, ...build
  } = data.build
  const directory = build.changelogs?.length > 0
    ? DIRECTORY
    : DIRECTORY.filter(({ path }) => path !== 'changelog')
  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

  // const complete = (
  //   build.status === BuildStatus.FAILED || build.status === BuildStatus.SUCCESSFUL
  // )

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
      position="relative"
    >
      <ResponsiveLayoutSidenavContainer width={240}>
        <Flex
          align="center"
          gap="small"
          marginBottom="large"
        >
          {hasIcons(app) && (
            <AppIcon
              url={getIcon(app, dark)}
              size="small"
            />
          )}
          <Div>
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
          </Div>
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
      <ResponsiveLayoutSidecarContainer width={200}>
        <Flex
          direction="column"
          gap="xsmall"
          marginBottom="xsmall"
        >
          <BuildRestart build={build} />
          <BuildApproval build={build} />
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
            <Prop title="Build type">{BUILD_TYPE_DISPLAY_NAMES[build.type] || build.type}</Prop>
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
    </Flex>
    // TODO: {!complete && <Cancel build={build} />}
  )
}
