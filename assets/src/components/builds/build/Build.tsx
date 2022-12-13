import {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useMutation, useQuery } from 'react-apollo'
import { Button, ModalHeader } from 'forge-core'
import { Box, Layer, Text } from 'grommet'

import { mergeEdges } from 'components/graphql/utils'

import {
  APPROVE_BUILD,
  BUILD_Q,
  BUILD_SUB,
  CANCEL_BUILD,
  COMMAND_SUB,
  RESTART_BUILD,
} from 'components/graphql/builds'

import '../../build.css'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import {
  AppIcon,
  CraneIcon,
  LoopingLogo,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { Flex } from 'honorable'

import { PropsContainer } from 'components/utils/PropsContainer'
import Prop from 'components/utils/Prop'
import { BuildStatus } from 'components/types'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { BUILD_TYPE_DISPLAY_NAMES } from '../Build'

import { BuildTimer } from './BuildTimer'

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

export function Rebuild({ build: { id } }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mutation, { loading }] = useMutation(RESTART_BUILD, {
    variables: { id },
    onCompleted: ({ restartBuild: { id } }) => navigate(`/builds/${id}`),
  })

  return (
    <>
      <OptionContainer
        hoverIndicator="card"
        onClick={() => setOpen(true)}
      >
        <Text size="small">restart</Text>
      </OptionContainer>
      {open && (
        <Layer modal>
          <Box width="40vw">
            <ModalHeader
              text="Are you sure you want to restart this build?"
              setOpen={setOpen}
            />
            <Box
              direction="row"
              justify="end"
              pad="medium"
            >
              <Button
                label="restart"
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

export function Approval({ build }) {
  const [mutation, { loading }] = useMutation(APPROVE_BUILD, { variables: { id: build.id } })

  if (build.approver) {
    return (
      <OptionContainer>
        <Text size="small">approved by: {build.approver.name}</Text>
      </OptionContainer>
    )
  }

  if (build.status !== BuildStatus.PENDING) return null

  return (
    <OptionContainer>
      <Button
        label="approve"
        loading={loading}
        onClick={mutation}
      />
    </OptionContainer>
  )
}

const DIRECTORY = [
  { path: 'progress', label: 'Progress' },
  { path: 'changelog', label: 'Changelog' },
]

export default function Build() {
  const tabStateRef = useRef<any>(null)
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

  const { commands: { edges }, creator, ...build } = data.build
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
        {build.repository}
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
        <Button
          secondary
          fontWeight={600}
          marginTop="xxsmall"
          marginBottom="small"
          startIcon={<CraneIcon />}
          onClick={e => e.stopPropagation()}
        >
          Restart build
        </Button>
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
                {creator.name}
              </Prop>
            )}
          </PropsContainer>
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
    // TODO:
    //     <Approval build={build} />
    //     <Rebuild build={build} />
    //     {!complete && <Cancel build={build} />}
  )
}
