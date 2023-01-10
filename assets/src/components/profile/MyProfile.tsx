import { Flex } from 'honorable'
import {
  PageCard,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import { useContext, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'
import { LoginContext } from 'components/contexts'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

const directory = [
  { path: 'me', label: 'Profile' },
  { path: 'security', label: 'Security' },
  { path: 'permissions', label: 'Permissions' },
]

export default function MyProfile() {
  const tabStateRef = useRef<any>(null)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { me } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const pathPrefix = '/profile'

  useEffect(() => setBreadcrumbs([{ text: 'profile', url: '/profile' }]), [setBreadcrumbs])

  if (!me) return null

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
        <PageCard
          heading={me.name}
          icon={{ name: me.name, url: me.avatar, spacing: 'none' }}
          subheading={me?.email}
          marginBottom="xlarge"
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
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
