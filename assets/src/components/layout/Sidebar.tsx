import { GITHUB_LINK } from 'utils/constants'

import { useMutation } from '@apollo/client'
import {
  AiSparkleOutlineIcon,
  ArrowTopRightIcon,
  BellIcon,
  CatalogIcon,
  CostManagementIcon,
  Sidebar as DSSidebar,
  GearTrainIcon,
  GitHubLogoIcon,
  GitPullIcon,
  HomeIcon,
  KubernetesAltIcon,
  LogoutIcon,
  PersonIcon,
  PrOpenIcon,
  ScrollIcon,
  SidebarExpandButton,
  SidebarExpandWrapper,
  SidebarItem,
  SidebarSection,
  StackIcon,
  Tooltip,
  WarningShieldIcon,
  RamIcon,
} from '@pluralsh/design-system'
import { ME_Q } from 'components/graphql/users'
import { Avatar, Flex, Menu, MenuItem } from 'honorable'
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { updateCache } from 'utils/graphql'

import { useDefaultCDPath } from 'components/cd/ContinuousDeployment'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { PersonaConfigurationFragment } from 'generated/graphql'
import { PR_DEFAULT_ABS_PATH } from 'routes/prRoutesConsts'

import { SECURITY_ABS_PATH } from 'routes/securityRoutesConsts'

import { SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { AI_ABS_PATH } from '../../routes/aiRoutes.tsx'

import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'
import { useLogin } from '../contexts'

import HelpLauncher from '../help/HelpLauncher'

import { useOutsideClick } from 'components/hooks/useOutsideClick.tsx'
import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import CommandPaletteShortcuts from '../commandpalette/CommandPaletteShortcuts.tsx'
import { NotificationsPanelOverlay } from './NotificationsPanelOverlay'
import { MARK_READ } from './queries'
import { EDGE_ABS_PATH } from '../../routes/edgeRoutes.tsx'

type MenuItem = {
  text: string
  icon: ReactElement<any>
  path: string
  pathRegexp?: RegExp
  ignoreRegexp?: RegExp
  hotkeys?: string[]
  enabled?: boolean
  expandedLabel: string
}

// Keep hotkeys in sync with assets/src/components/commandpalette/commands.ts.
function getMenuItems({
  isCDEnabled,
  cdPath,
  personaConfig,
}: {
  isSandbox: boolean
  isCDEnabled: boolean
  cdPath: string
  personaConfig: Nullable<PersonaConfigurationFragment>
}): MenuItem[] {
  return [
    {
      text: 'Home',
      expandedLabel: 'Home',
      icon: <HomeIcon />,
      path: '/',
      hotkeys: ['shift H', '1'],
    },
    {
      text: 'Continuous deployment',
      expandedLabel: 'CD',
      icon: <GitPullIcon />,
      path: cdPath,
      pathRegexp: /^(\/cd)|(\/cd\/.*)$/,
      ignoreRegexp: /^\/cd\/settings.*$/,
      hotkeys: ['shift C', '2'],
    },
    {
      text: 'Stacks',
      expandedLabel: 'Stacks',
      icon: <StackIcon />,
      path: getStacksAbsPath(''),
      hotkeys: ['shift S', '3'],
    },
    {
      text: 'Service catalog',
      expandedLabel: 'Service catalog',
      icon: <CatalogIcon />,
      path: CATALOGS_ABS_PATH,
      hotkeys: ['4'],
    },
    {
      text: 'Kubernetes',
      expandedLabel: 'Kubernetes',
      icon: <KubernetesAltIcon />,
      path: `/${KUBERNETES_ROOT_PATH}`,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
      hotkeys: ['shift K', '5'],
    },
    {
      text: 'Plural AI',
      expandedLabel: 'Plural AI',
      icon: <AiSparkleOutlineIcon />,
      path: `${AI_ABS_PATH}`,
      hotkeys: ['shift A', '6'],
    },
    {
      text: 'Edge',
      expandedLabel: 'Edge',
      icon: <RamIcon />,
      path: EDGE_ABS_PATH,
      hotkeys: ['shift E'],
    },
    {
      text: 'PRs',
      expandedLabel: 'Pull requests',
      icon: <PrOpenIcon />,
      path: PR_DEFAULT_ABS_PATH,
      pathRegexp: /^(\/pr)|(\/pr\/.*)$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.pullRequests),
      hotkeys: ['shift P', '7'],
    },
    {
      text: 'Security',
      expandedLabel: 'Security',
      icon: <WarningShieldIcon />,
      path: SECURITY_ABS_PATH,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
      hotkeys: ['8'],
    },
    {
      text: 'Cost Management',
      expandedLabel: 'Cost Management',
      icon: <CostManagementIcon />,
      path: '/cost-management',
      hotkeys: ['shift C+M', '9'],
    },
    // {
    //   text: 'Backups',
    //   expandedLabel: 'Backups',
    //   icon: <HistoryIcon />,
    //   path: '/backups',
    //   enabled:
    //     isCDEnabled &&
    //     !!(personaConfig?.all || personaConfig?.sidebar?.backups),
    //   hotkeys: ['shift B', '9'],
    // },
    {
      text: 'Settings',
      expandedLabel: 'Settings',
      icon: <GearTrainIcon />,
      path: SETTINGS_ABS_PATH,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.settings),
      hotkeys: ['0'],
    },
  ].filter((item) => item.enabled !== false)
}

function isActiveMenuItem(
  {
    path,
    pathRegexp,
    ignoreRegexp,
  }: Pick<MenuItem, 'path' | 'pathRegexp' | 'ignoreRegexp'>,
  currentPath
) {
  return (
    (path === '/' ? currentPath === path : currentPath.startsWith(path)) ||
    (pathRegexp &&
      (currentPath.match(pathRegexp)?.length ?? 0 > 0) &&
      (!ignoreRegexp || (currentPath.match(ignoreRegexp)?.length ?? 0) === 0))
  )
}

const SidebarSC = styled(DSSidebar).attrs(({ variant }) => ({
  variant,
}))((_) => ({
  flexGrow: 1,
  minHeight: 0,
  height: 'auto',
  overflow: 'visible',
}))

const NotificationsCountSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors['text-always-white'],
  backgroundColor: theme.colors['icon-danger-critical'],
  borderRadius: '50%',
  fontSize: 10,
  height: 15,
  width: 15,
  position: 'absolute',
  left: 16,
  top: 2,
  userSelect: 'none',
}))

export default function Sidebar() {
  const menuItemRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] =
    useState(false)
  const { me, configuration, personaConfiguration } = useLogin()
  const { pathname } = useLocation()
  const isActive = useCallback(
    (menuItem: Parameters<typeof isActiveMenuItem>[0]) =>
      isActiveMenuItem(menuItem, pathname),
    [pathname]
  )
  const isCDEnabled = useCDEnabled({ redirect: false })
  const defaultCDPath = useDefaultCDPath()

  const menuItems = useMemo(
    () =>
      getMenuItems({
        isSandbox: !!configuration?.isSandbox,
        isCDEnabled,
        cdPath: defaultCDPath,
        personaConfig: personaConfiguration,
      }),
    [personaConfiguration, configuration?.isSandbox, isCDEnabled, defaultCDPath]
  )

  const [mutation] = useMutation(MARK_READ, {
    update: (cache) =>
      updateCache(cache, {
        query: ME_Q,
        update: ({ me, ...rest }) => ({
          ...rest,
          me: { ...me, unreadNotifications: 0 },
        }),
      }),
  })

  const toggleNotificationPanel = useCallback(
    (open) => {
      if (!open) mutation()
      setIsNotificationsPanelOpen(open)
    },
    [mutation, setIsNotificationsPanelOpen]
  )

  const { logout } = useLogin()
  const handleLogout = useCallback(() => {
    setIsMenuOpen(false)
    logout?.()
  }, [logout])

  useOutsideClick(menuRef, (event) => {
    if (!menuItemRef.current?.contains(event.target as any)) {
      setIsMenuOpen(false)
    }
  })

  useOutsideClick(notificationsPanelRef, () => toggleNotificationPanel(false))

  const theme = useTheme()

  if (!me) return null
  const unreadNotifications = me.unreadNotifications || 0

  return (
    <SidebarSC variant="console">
      <SidebarExpandWrapper pathname={pathname}>
        <SidebarSection
          grow={1}
          shrink={1}
          border="none"
        >
          {menuItems.map((item, i) => (
            <Tooltip
              key={i}
              label={
                <div
                  css={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: theme.spacing.small,
                  }}
                >
                  {item.expandedLabel}
                  <CommandPaletteShortcuts shortcuts={item.hotkeys} />
                </div>
              }
            >
              <SidebarItem
                clickable
                className={`sidebar-${item.text}`}
                active={isActive(item)}
                as={Link}
                to={item.path}
                expandedLabel={item.expandedLabel}
              >
                {item.icon}
              </SidebarItem>
            </Tooltip>
          ))}
          <Flex grow={1} />
          <SidebarExpandButton />
          <SidebarItem
            tooltip="GitHub"
            className="sidebar-github"
            clickable
            as="a"
            target="_blank"
            rel="noopener noreferrer"
            href={`${GITHUB_LINK}/plural`}
            expandedLabel="GitHub"
          >
            <GitHubLogoIcon />
          </SidebarItem>
          {!configuration?.byok && (
            <SidebarItem
              clickable
              label="Notifications"
              tooltip="Notifications"
              className="sidebar-notifications"
              css={{
                position: 'relative',
              }}
              onClick={(event) => {
                event.stopPropagation()
                toggleNotificationPanel(!isNotificationsPanelOpen)
              }}
              badge={unreadNotifications}
              active={isNotificationsPanelOpen}
              expandedLabel="Notifications"
            >
              <BellIcon />
              {unreadNotifications > 0 && (
                <NotificationsCountSC>
                  {unreadNotifications > 99 ? '!' : unreadNotifications}
                </NotificationsCountSC>
              )}
            </SidebarItem>
          )}
          <HelpLauncher />
          <SidebarItem
            ref={menuItemRef}
            className="sidebar-menu"
            active={isMenuOpen}
            clickable
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen((x) => !x)
            }}
            expandedLabel="Menu"
            css={{
              paddingLeft: theme.spacing.xxsmall,
            }}
          >
            <Avatar
              name={me.name}
              src={me.profile}
              size={32}
            />
          </SidebarItem>
        </SidebarSection>
        {/* ---
        NOTIFICATIONS PANEL
      --- */}
        <NotificationsPanelOverlay
          isOpen={isNotificationsPanelOpen}
          setIsOpen={setIsNotificationsPanelOpen}
        />
        {isMenuOpen && (
          <Menu
            ref={menuRef}
            zIndex={999}
            position="absolute"
            bottom={8}
            minWidth="175px"
            left="calc(100% + 10px)"
            border="1px solid border"
          >
            <MenuItem
              as={Link}
              to="/profile"
              className="sidebar-menu-myprofile"
              color="inherit"
              onClick={() => setIsMenuOpen(false)}
              textDecoration="none"
            >
              <PersonIcon marginRight="xsmall" />
              My profile
            </MenuItem>
            <MenuItem
              as="a"
              href="https://docs.plural.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-menu-docs"
              color="inherit"
              onClick={() => setIsMenuOpen(false)}
              textDecoration="none"
            >
              <ScrollIcon marginRight="xsmall" />
              Docs
              <Flex flexGrow={1} />
              <ArrowTopRightIcon />
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              className="sidebar-menu-logout"
              color="icon-error"
            >
              <LogoutIcon marginRight="xsmall" />
              Logout
            </MenuItem>
          </Menu>
        )}
      </SidebarExpandWrapper>
    </SidebarSC>
  )
}
