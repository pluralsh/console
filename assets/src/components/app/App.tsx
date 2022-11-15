import { Flex } from 'honorable'
import { Tab, TabList, TabPanel } from 'pluralsh-design-system'

import { useContext, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { InstallationContext } from 'components/Installations'

import { ResponsiveLayoutSidenavContainer } from '../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../layout/ResponsiveLayoutContentContainer'

import { LoginContext } from '../contexts'

const DIRECTORY = [
  { path: '/app/me', label: 'Dashboards' }, // path: '/dashboards/{repo}'
  { path: '/profile/security', label: 'Runbooks' }, // path: '/runbooks/{repo}'
  { path: '/profile/tokens', label: 'Components' }, // path: '/components/{repo}'
  { path: '/profile/keys', label: 'Logs' }, // path: '/logs/{repo}'
  { path: '/profile/eab', label: 'Configuration' }, // path: '/config/{repo}', git: true
  // TODO: Cost analysis?
  //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
]

export default function App() {
  const { me }: any = useContext(LoginContext)
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentTab = DIRECTORY.find(tab => pathname?.startsWith(tab.path))
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/app/${currentApplication.name}` },
  ]), [currentApplication, setBreadcrumbs])

  if (!me) return null

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding={32}
      paddingTop={88}
    >
      <ResponsiveLayoutSidenavContainer width={240}>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label }) => (
            <Tab>{label}</Tab>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer />}
        stateRef={tabStateRef}
      >
        {/* <Outlet /> */}
      </TabPanel>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
