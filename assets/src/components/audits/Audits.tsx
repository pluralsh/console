import {
  Key,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { Box, Text } from 'grommet'

import { SubTab, TabList } from '@pluralsh/design-system'

import { Flex, Span } from 'honorable'

import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'

import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import Avatar from '../utils/Avatar'

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
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const currentView
    = DIRECTORY.find(tab => pathname?.startsWith(`/audits/${tab.path}`))?.path
    || DIRECTORY[0].path
  const [view, setView] = useState<Key>(currentView)

  useEffect(() => setBreadcrumbs([{ text: 'audits', url: '/audits' }]),
    [setBreadcrumbs])

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer />
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer overflowY="hidden">
        <ScrollablePage
          scrollable={false}
          heading="Audits"
          headingContent={(
            <>
              <Flex grow={1} />
              <TabList
                margin={1}
                stateRef={tabStateRef}
                stateProps={{
                  orientation: 'horizontal',
                  selectedKey: view,
                  onSelectionChange: view => {
                    setView(view)
                    navigate(view as string)
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
            </>
          )}
        >
          <Outlet />
        </ScrollablePage>
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
