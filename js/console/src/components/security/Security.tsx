import {
  PageContentSC,
  PageRowSC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageSidecarSlotContext,
  PageSidecarSlotSC,
  PageWithSidebar,
} from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { PageSidebarNav } from 'components/layout/PageSidebarNav'
import { useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  COMPLIANCE_REPORTS_REL_PATH,
  GATEKEEPER_REL_PATH,
  POLICIES_ABS_PATH,
  POLICIES_ATTACHMENT_RULES_ABS_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { POLICIES_TABS } from './policies/Policies'

const directory = [
  { path: SECURITY_OVERVIEW_REL_PATH, label: 'Security overview' },
  { path: POLICIES_REL_PATH, label: 'Policies' },
  { path: GATEKEEPER_REL_PATH, label: 'Gatekeeper' },
  { path: VULNERABILITY_REPORTS_REL_PATH, label: 'Vulnerability reports' },
  { path: COMPLIANCE_REPORTS_REL_PATH, label: 'Compliance reports' },
]

export function Security() {
  const policiesMatch = useMatch(POLICIES_ABS_PATH)
  const attachmentRulesMatch = useMatch(POLICIES_ATTACHMENT_RULES_ABS_PATH)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [sidecarSlot, setSidecarSlot] = useState<HTMLDivElement | null>(null)

  return (
    <PageWithSidebar
      sidebar={
        <PageSidebarSC>
          <PageSidebarHeaderSC>
            <SidebarTitleSC>Security</SidebarTitleSC>
          </PageSidebarHeaderSC>
          <PageSidebarNav
            directory={directory}
            pathPrefix={SECURITY_ABS_PATH}
          />
        </PageSidebarSC>
      }
      toolbar={
        <PageToolbar
          tabs={
            policiesMatch || attachmentRulesMatch ? POLICIES_TABS : undefined
          }
          activeFn={(path) =>
            path ===
            (attachmentRulesMatch
              ? POLICIES_ATTACHMENT_RULES_ABS_PATH
              : POLICIES_ABS_PATH)
          }
          slotRef={setToolbarSlot}
        />
      }
    >
      <PageRowSC>
        <PageContentSC>
          <PageToolbarSlotContext value={toolbarSlot}>
            <PageSidecarSlotContext value={sidecarSlot}>
              <Outlet />
            </PageSidecarSlotContext>
          </PageToolbarSlotContext>
        </PageContentSC>
        <PageSidecarSlotSC ref={setSidecarSlot} />
      </PageRowSC>
    </PageWithSidebar>
  )
}

const SidebarTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
}))
