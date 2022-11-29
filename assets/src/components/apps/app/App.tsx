import { A, Flex } from 'honorable'
import {
  ArrowTopRightIcon,
  Button,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import { useContext, useRef, useState } from 'react'
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

import { ResponsiveLayoutSidenavContainer } from '../../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../../layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../../layout/ResponsiveLayoutContentContainer'

import { LoginContext } from '../../contexts'

import AppStatus from '../AppStatus'

import AppSelector from './AppSelector'

// TODO: Keep current path when switching views if possible.
const getDirectory = app => [
  { path: 'dashboards', label: 'Dashboards', enabled: true },
  { path: 'runbooks', label: 'Runbooks', enabled: true },
  { path: 'components', label: 'Components', enabled: true },
  { path: 'logs', label: 'Logs', enabled: true },
  { path: 'config', label: 'Configuration', enabled: true }, // path: '/config/{repo}', git: true
  //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
  { path: 'cost', label: 'Cost analysis', enabled: app.cost || app.license },
]

export default function App() {
  const tabStateRef = useRef<any>(null)
  const { me }: any = useContext(LoginContext)
  const { pathname } = useLocation()
  const { appName, dashboardId } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const [dashboardDescription, setDashboardDescription] = useState<string>('')
  const pathPrefix = `/apps/${appName}`
  const currentApp = applications.find(app => app.name === appName)

  if (!me || !currentApp) return null

  const directory = getDirectory(currentApp).filter(({ enabled }) => enabled)
  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))
  const { name, spec: { descriptor: { links, version } } } = currentApp
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
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
        <Outlet context={{ setDashboardDescription }} />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer width="200px">
        {validLinks?.length > 0 && (
          <Button
            secondary
            fontWeight={600}
            marginTop="xxsmall"
            marginBottom="small"
            endIcon={<ArrowTopRightIcon size={14} />}
            as="a"
            href={toAbsoluteURL(links[0].url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            Launch {name}
          </Button>
        )}
        <Flex
          gap="medium"
          direction="column"
          marginTop={validLinks?.length > 0 ? 0 : 56}
          paddingTop="xsmall"
        >
          <PropsContainer>
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
          {dashboardId && (
            <PropsContainer>
              <Prop title="Description">{dashboardDescription}</Prop>
            </PropsContainer>
          )}
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
