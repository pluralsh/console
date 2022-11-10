import { Flex } from 'honorable'
import {
  PageCard,
  Tab,
  TabList,
  TabPanel,
} from 'pluralsh-design-system'

import { useContext, useRef } from 'react'

import { ResponsiveLayoutSidenavContainer } from '../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../layout/ResponsiveLayoutContentContainer'

import { LoginContext } from '../contexts'

const DIRECTORY = [
  { path: '/profile/me', label: 'Profile' },
  { path: '/profile/security', label: 'Security' },
  { path: '/profile/tokens', label: 'Access tokens' },
  { path: '/profile/keys', label: 'Public keys' },
  { path: '/profile/eab', label: 'EAB credentials' },
]

export default function Apps() {
  const { me }: any = useContext(LoginContext)
  // const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  // const currentTab = DIRECTORY.find(tab => pathname?.startsWith(tab.path))

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
        <PageCard
          heading={me.name}
          icon={{ name: me.name, spacing: 'none' }} // icon={{ name: me.name, url: me.avatar, spacing: 'none' }}
          // subheading={me?.roles?.admin && (
          //   `Admin${me?.account?.name && ` at ${me?.account?.name}`}`
          // )}
          marginBottom="xlarge"
        />
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            // selectedKey: currentTab?.path,
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
