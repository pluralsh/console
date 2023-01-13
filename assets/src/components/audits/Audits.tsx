import { Key, useRef, useState } from 'react'

import { Box, Text } from 'grommet'

import { PageTitle, SubTab, TabList } from '@pluralsh/design-system'

import { Flex, Span } from 'honorable'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import Avatar from '../account/Avatar'

export function AvatarCell({ user, width }) {
  return (
    <Box
      flex={false}
      direction="row"
      width={width}
      align="center"
      gap="xsmall"
    >
      <Avatar
        user={user}
        size="30px"
        onClick={undefined}
        round={undefined}
      />
      <Text size="small">{user.email}</Text>
    </Box>
  )
}

const DIRECTORY = [
  { path: 'table', label: 'Table view' },
  { path: 'graph', label: 'Graph view' },
]

export default function Audits() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentView = DIRECTORY.find(tab => pathname?.startsWith(`/audits/${tab.path}`))?.path || DIRECTORY[0].path
  const [view, setView] = useState<Key>(currentView)

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
      position="relative"
    >
      <ResponsiveLayoutSidenavContainer width={240} />
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer overflowY="hidden">
        <PageTitle heading="Audits">
          <Flex grow={1} />
          <TabList
            margin={1}
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: view,
              onSelectionChange: view => {
                setView(view)
                navigate(view)
              },
            }}
          >
            {DIRECTORY.map(({ path, label }) => (
              <SubTab
                key={path}
                textValue={label}
              >
                <Span fontWeight={600}>{label}</Span>
              </SubTab>
            ))}
          </TabList>
        </PageTitle>
        <Outlet />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
