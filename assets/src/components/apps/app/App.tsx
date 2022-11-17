import { Flex } from 'honorable'
import { Tab, TabList, TabPanel } from 'pluralsh-design-system'

import { useContext, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { InstallationContext } from 'components/Installations'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { Prop, PropsContainer } from 'components/utils/props'

import { ResponsiveLayoutSidenavContainer } from '../../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../../layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../../layout/ResponsiveLayoutContentContainer'

import { LoginContext } from '../../contexts'

import AppStatus from '../AppStatus'

const DIRECTORY = [
  { path: 'dashboards', label: 'Dashboards' },
  { path: 'runbooks', label: 'Runbooks' },
  { path: 'components', label: 'Components' },
  { path: 'logs', label: 'Logs' },
  { path: 'config', label: 'Configuration' }, // path: '/config/{repo}', git: true
  //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
    // TODO: Cost analysis?
]

export default function App() {
  const { me }: any = useContext(LoginContext)
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const pathPrefix = `/apps/${currentApplication.name}`
  const currentTab = DIRECTORY.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/apps/${currentApplication.name}` },
  ]), [currentApplication, setBreadcrumbs])

  if (!me || !currentApplication) return null

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
    >
      <ResponsiveLayoutSidenavContainer width={240}>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label, path }, i) => (
            <Tab
              key={i}
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
      <ResponsiveLayoutSidecarContainer width="200px">
        <Flex
          gap="medium"
          direction="column"
          paddingTop="xsmall"
        >
          <PropsContainer title="metadata">
            <Prop title="Current version">v{currentApplication?.spec?.descriptor?.version}</Prop>
            <Prop title="Status"><AppStatus application={currentApplication} /></Prop>
          </PropsContainer>
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
