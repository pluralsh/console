import { A, Flex } from 'honorable'
import { Tab, TabList, TabPanel } from '@pluralsh/design-system'

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

import { toAbsoluteURL } from 'utils/url'

import Prop from 'components/utils/Prop'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { LoginContext } from '../../../../contexts'

import AppStatus from '../../../AppStatus'

import AppSelector from '../../AppSelector'

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

  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))
  const { spec: { descriptor: { links, version } } } = currentApp
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
      position="relative"
    >
      <ResponsiveLayoutSidenavContainer width={240}>
        <AppSelector
          applications={applications}
          currentApp={currentApp}
        />
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
        <Flex
          gap="medium"
          direction="column"
          marginTop={validLinks?.length > 0 ? 0 : 56}
          paddingTop="xsmall"
        >
          <PropsContainer title="App">
            <Prop title="Current version">v{version}</Prop>
            <Prop title="Status"><AppStatus app={currentApp} /></Prop>
            {validLinks?.length > 1 && (
              <Prop title="Other links">
                {validLinks.slice(1).map(({ url }) => (
                  <A
                    inline
                    href={toAbsoluteURL(url)}
                    as="a"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </A>
                ))}
              </Prop>
            )}
          </PropsContainer>
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}

