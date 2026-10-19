import { ArrowTopRightIcon, Breadcrumb, Button } from '@pluralsh/design-system'
import { BillingSubscriptionChip } from 'components/billing/BillingSubscriptionChip'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { useLogin } from 'components/contexts'
import {
  PageContentSC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageWithSidebar,
} from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
  ToolbarTabs,
} from 'components/layout/PageToolbar'
import { PageSidebarNav } from 'components/layout/PageSidebarNav'
import { Directory } from 'components/layout/SideNavEntries'
import { hasAccess } from 'components/utils/persona'
import { SubtabDirectory } from 'components/utils/SubTabs'
import { TRUNCATE } from 'components/utils/truncate'
import {
  Body1P,
  Body2BoldP,
  Body2P,
  CaptionP,
} from 'components/utils/typography/Text'
import { PersonaConfigurationFragment } from 'generated/graphql'
import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  ACCESS_TOKENS_REL_PATH,
  AI_SETTINGS_REL_PATH,
  AUDITS_REL_PATH,
  CHATBOTS_SETTINGS_REL_PATH,
  CLOUD_CONNECTIONS_SETTINGS_REL_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  NOTIFICATIONS_REL_PATH,
  PROJECT_SETTINGS_REL_PATH,
  SETTINGS_ABS_PATH,
  USER_MANAGEMENT_REL_PATH,
  WEBHOOKS_SETTINGS_REL_PATH,
} from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'

export const getDirectory = (
  personaConfiguration: Nullable<PersonaConfigurationFragment>
): Directory => [
  {
    path: USER_MANAGEMENT_REL_PATH,
    label: 'User management',
    enabled: hasAccess(personaConfiguration, 'settings.userManagement', true),
  },
  {
    path: GLOBAL_SETTINGS_REL_PATH,
    label: 'Global settings',
    enabled: hasAccess(personaConfiguration, 'settings.global', true),
  },
  {
    path: AI_SETTINGS_REL_PATH,
    label: 'AI settings',
    enabled: hasAccess(personaConfiguration, 'settings.ai', true),
  },
  {
    path: WEBHOOKS_SETTINGS_REL_PATH,
    label: 'Webhooks settings',
    enabled: hasAccess(personaConfiguration, 'settings.webhooks', true),
  },
  {
    path: CHATBOTS_SETTINGS_REL_PATH,
    label: 'Chatbots settings',
    enabled: hasAccess(personaConfiguration, 'settings.chatbots', true),
  },
  {
    path: CLOUD_CONNECTIONS_SETTINGS_REL_PATH,
    label: 'Cloud Connections',
    enabled: hasAccess(personaConfiguration, 'settings.cloudConnections', true),
  },
  {
    path: PROJECT_SETTINGS_REL_PATH,
    label: 'Project settings',
    enabled: hasAccess(personaConfiguration, 'settings.projects', true),
  },
  {
    path: NOTIFICATIONS_REL_PATH,
    label: 'Notifications',
    enabled: hasAccess(personaConfiguration, 'settings.notifications', true),
  },
  {
    path: AUDITS_REL_PATH,
    label: 'Audit logs',
    enabled: hasAccess(
      personaConfiguration,
      'settings.audits',
      hasAccess(personaConfiguration, 'sidebar.audits')
    ),
  },
  {
    path: ACCESS_TOKENS_REL_PATH,
    label: 'Access tokens',
    enabled: hasAccess(personaConfiguration, 'settings.accessTokens', true),
  },
]

export const SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  { label: 'settings', url: SETTINGS_ABS_PATH },
]

const SettingsToolbarStartContext = createContext<Nullable<HTMLElement>>(null)

// renders at the start of the settings toolbar, e.g. a section's subtabs
export function SettingsToolbarStart({ children }: { children: ReactNode }) {
  const slot = useContext(SettingsToolbarStartContext)

  return slot ? createPortal(children, slot) : null
}

export function SettingsToolbarTabs({
  directory,
}: {
  directory: SubtabDirectory
}) {
  const { pathname } = useLocation()

  return (
    <SettingsToolbarStart>
      <ToolbarTabs
        directory={directory}
        activeFn={(path) =>
          pathname === path || pathname.startsWith(`${path}/`)
        }
      />
    </SettingsToolbarStart>
  )
}

export function SettingsDescription({ children }: { children: ReactNode }) {
  return <Body1P $color="text-light">{children}</Body1P>
}

export default function Settings() {
  const theme = useTheme()
  const { personaConfiguration, me, configuration } = useLogin()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [startSlot, setStartSlot] = useState<HTMLDivElement | null>(null)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

  return (
    <PageWithSidebar
      sidebar={
        <PageSidebarSC>
          <PageSidebarHeaderSC>
            <Body2BoldP>Settings</Body2BoldP>
          </PageSidebarHeaderSC>
          <PageSidebarNav
            directory={getDirectory(personaConfiguration)}
            pathPrefix={SETTINGS_ABS_PATH}
          />
          <SidebarFooterSC>
            <div>
              <CaptionP $color="text-xlight">Account name</CaptionP>
              <Body2P css={TRUNCATE}>{me?.name}</Body2P>
            </div>
            <div>
              <CaptionP
                $color="text-xlight"
                css={{ marginBottom: theme.spacing.xxsmall }}
              >
                Plan
              </CaptionP>
              <BillingSubscriptionChip asLink />
            </div>
            {configuration?.pluralLogin && (
              <Button
                secondary
                small
                as={Link}
                to="https://app.plural.sh/account/edit"
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<ArrowTopRightIcon />}
              >
                Edit account
              </Button>
            )}
          </SidebarFooterSC>
        </PageSidebarSC>
      }
      toolbar={
        <PageToolbar
          start={
            <div
              ref={setStartSlot}
              css={{ display: 'contents' }}
            />
          }
          slotRef={setToolbarSlot}
        >
          {headerContent}
        </PageToolbar>
      }
    >
      <PageContentSC $maxWidth={theme.breakpoints.desktopLarge}>
        <PageHeaderContext value={pageHeaderContext}>
          <PageToolbarSlotContext value={toolbarSlot}>
            <SettingsToolbarStartContext value={startSlot}>
              <Outlet />
            </SettingsToolbarStartContext>
          </PageToolbarSlotContext>
        </PageHeaderContext>
      </PageContentSC>
    </PageWithSidebar>
  )
}

const SidebarFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  flexShrink: 0,
  padding: theme.spacing.medium,
  borderTop: theme.borders.default,
}))
