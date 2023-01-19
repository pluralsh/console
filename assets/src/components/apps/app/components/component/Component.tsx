import {
  Div,
  Flex,
  H2,
  P,
} from 'honorable'
import {
  AppIcon,
  LoopingLogo,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import { useContext, useRef } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'

import { InstallationContext } from 'components/Installations'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'

import { PropsContainer } from 'components/utils/PropsContainer'

import Prop from 'components/utils/Prop'

import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'

import { useQuery } from '@apollo/client'

import { POLL_INTERVAL } from 'components/cluster/constants'

import {
  CERTIFICATE_Q,
  CRON_JOB_Q,
  DEPLOYMENT_Q,
  INGRESS_Q,
  JOB_Q,
  SERVICE_Q,
  STATEFUL_SET_Q,
} from 'components/cluster/queries'

import { LoginContext } from 'components/contexts'

import { ComponentIcon, ComponentStatus } from '../misc'

const directory = [
  { label: 'Info', path: 'info' },
  { label: 'Metrics', path: 'metrics', onlyFor: ['deployment', 'statefulset'] },
  { label: 'Events', path: 'events' },
  { label: 'Raw', path: 'raw' },
]

const kindToQuery = {
  certificate: CERTIFICATE_Q,
  cronjob: CRON_JOB_Q,
  deployment: DEPLOYMENT_Q,
  ingress: INGRESS_Q,
  job: JOB_Q,
  service: SERVICE_Q,
  statefulset: STATEFUL_SET_Q,
}

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const { appName, componentKind = '', componentName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const pathPrefix = `/apps/${appName}/components/${componentKind}/${componentName}`
  const currentApp = applications.find(app => app.name === appName)
  const { data, loading, refetch } = useQuery(kindToQuery[componentKind],
    { variables: { name: componentName, namespace: appName }, pollInterval: POLL_INTERVAL })

  if (!me || !currentApp || !data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const component = currentApp.status.components
    .find(({ name, kind }) => name === componentName && kind.toLowerCase() === componentKind)
  const filteredDirectory = directory.filter(({ onlyFor }) => !onlyFor || onlyFor.includes(componentKind))
  const currentTab = filteredDirectory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

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
          <AppIcon
            icon={(
              <ComponentIcon
                size={48}
                kind={componentKind}
              />
            )}
            size="small"
          />
          <Div>
            <H2
              subtitle2
              fontWeight="500"
            >
              {componentName}
            </H2>
            <P
              color="text-xlight"
              caption
            >
              {component?.group || 'v1'}/{component?.kind}
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
          {filteredDirectory.map(({ label, path }) => (
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
        <Outlet context={{
          component, data, loading, refetch,
        }}
        />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer width={200}>
        <PropsContainer marginTop={64}>
          <Prop title="Name">{componentName}</Prop>
          <Prop title="Namespace">{appName}</Prop>
          <Prop title="Kind">{component?.group || 'v1'}/{component?.kind}</Prop>
          <Prop title="Status"><ComponentStatus status={component?.status} /></Prop>
        </PropsContainer>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}

