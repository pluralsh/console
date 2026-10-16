import { PageCard } from '@pluralsh/design-system'

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useLogin } from 'components/contexts'
import {
  PageContentSC,
  PageSidebarBodySC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageWithSidebar,
} from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { Body2BoldP } from 'components/utils/typography/Text'

const PROFILE_ABS_PATH = '/profile'

const directory = [
  { path: 'me', label: 'Profile' },
  { path: 'email-settings', label: 'Email settings' },
  { path: 'security', label: 'Security' },
  { path: 'groups', label: 'Groups' },
  { path: 'access-tokens', label: 'Access tokens' },
].map(({ path, label }) => ({ label, path: `${PROFILE_ABS_PATH}/${path}` }))

export const PROFILE_BREADCRUMBS = [{ label: 'profile', url: PROFILE_ABS_PATH }]

export default function MyProfile() {
  const { me } = useLogin()
  const { pathname } = useLocation()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  if (!me) return null

  return (
    <PageWithSidebar
      sidebar={
        <PageSidebarSC>
          <PageSidebarHeaderSC>
            <Body2BoldP>Profile</Body2BoldP>
          </PageSidebarHeaderSC>
          <PageSidebarBodySC>
            <PageCard
              heading={me.name}
              icon={{
                name: me.name,
                url: me.profile,
                spacing: 'none',
              }}
              subheading={me?.email}
            />
          </PageSidebarBodySC>
        </PageSidebarSC>
      }
      toolbar={
        <PageToolbar
          tabs={directory}
          activeFn={(path) => pathname.startsWith(path)}
          slotRef={setToolbarSlot}
        />
      }
    >
      <PageContentSC $maxWidth={RESPONSIVE_LAYOUT_CONTENT_WIDTH}>
        <PageToolbarSlotContext value={toolbarSlot}>
          <Outlet />
        </PageToolbarSlotContext>
      </PageContentSC>
    </PageWithSidebar>
  )
}
