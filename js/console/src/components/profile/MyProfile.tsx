import { Avatar } from '@pluralsh/design-system'

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import styled from 'styled-components'

import { useLogin } from 'components/contexts'
import {
  PageContentSC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageWithSidebar,
} from 'components/layout/PageLayout'
import { PageSidebarNav } from 'components/layout/PageSidebarNav'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { Directory } from 'components/layout/SideNavEntries'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'

const PROFILE_ABS_PATH = '/profile'

const directory: Directory = [
  { path: 'me', label: 'Profile' },
  { path: 'email-settings', label: 'Email settings' },
  { path: 'security', label: 'Security' },
  { path: 'groups', label: 'Groups' },
  { path: 'access-tokens', label: 'Access tokens' },
]

export const PROFILE_BREADCRUMBS = [{ label: 'profile', url: PROFILE_ABS_PATH }]

export default function MyProfile() {
  const { me } = useLogin()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  if (!me) return null

  return (
    <PageWithSidebar
      sidebar={
        <PageSidebarSC>
          <PageSidebarHeaderSC>
            <Body2BoldP>Profile</Body2BoldP>
          </PageSidebarHeaderSC>
          <PageSidebarNav
            directory={directory}
            pathPrefix={PROFILE_ABS_PATH}
          />
          <SidebarFooterSC>
            <Avatar
              name={me.name}
              src={me.profile ?? undefined}
              size={32}
            />
            <div css={{ minWidth: 0 }}>
              <Body2BoldP css={TRUNCATE}>{me.name}</Body2BoldP>
              <CaptionP
                $color="text-xlight"
                css={TRUNCATE}
              >
                {me.email}
              </CaptionP>
            </div>
          </SidebarFooterSC>
        </PageSidebarSC>
      }
      toolbar={<PageToolbar slotRef={setToolbarSlot} />}
    >
      <PageContentSC $maxWidth={RESPONSIVE_LAYOUT_CONTENT_WIDTH}>
        <PageToolbarSlotContext value={toolbarSlot}>
          <Outlet />
        </PageToolbarSlotContext>
      </PageContentSC>
    </PageWithSidebar>
  )
}

const SidebarFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
  padding: theme.spacing.medium,
  borderTop: theme.borders.default,
}))
