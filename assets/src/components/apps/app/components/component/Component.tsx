import {
  Div,
  Flex,
  H2,
  P,
} from 'honorable'
import {
  AppIcon,
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

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { PropsContainer } from 'components/utils/PropsContainer'

import Prop from 'components/utils/Prop'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { LoginContext } from '../../../../contexts'

import { ComponentIcon, ComponentStatus } from '../misc'

const directory = [
  { label: 'Info', path: 'info' },
  { label: 'Events', path: 'events' },
  { label: 'Raw', path: 'raw' },
]

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const { appName, componentKind, componentName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const pathPrefix = `/apps/${appName}/components/${componentKind}/${componentName}`
  const currentApp = applications.find(app => app.name === appName)

  if (!me || !currentApp) return null

  const currentComponent = currentApp.status.components.find(({ name, kind }) => name === componentName && kind.toLowerCase() === componentKind)
  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

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
              {currentComponent?.group || 'v1'}/{componentKind?.toLowerCase()}
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
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer width={200}>
        <PropsContainer marginTop={64}>
          <Prop title="Name">{componentName}</Prop>
          <Prop title="Namespace">{appName}</Prop>
          <Prop title="Kind">{componentKind}</Prop>
          <Prop title="Status"><ComponentStatus status={currentComponent?.status} /></Prop>
        </PropsContainer>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}

