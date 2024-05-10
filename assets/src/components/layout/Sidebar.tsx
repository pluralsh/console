import { DISCORD_LINK, GITHUB_LINK } from 'utils/constants'

import {
  ApiIcon,
  AppsIcon,
  ArrowTopRightIcon,
  BellIcon,
  BuildIcon,
  Sidebar as DSSidebar,
  DatabaseIcon,
  DiscordIcon,
  GearTrainIcon,
  GitHubLogoIcon,
  GitPullIcon,
  HistoryIcon,
  HomeIcon,
  KubernetesIcon,
  LightningIcon,
  ListIcon,
  LogoutIcon,
  PeopleIcon,
  PersonIcon,
  PrOpenIcon,
  ScrollIcon,
  ServersIcon,
  SidebarItem,
  SidebarSection,
  StackIcon,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { Link, useLocation } from 'react-router-dom'
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react'
import { Avatar, Flex, Menu, MenuItem, useOutsideClick } from 'honorable'
import { ME_Q } from 'components/graphql/users'
import { useMutation } from '@apollo/client'
import { updateCache } from 'utils/graphql'
import styled from 'styled-components'
import { PersonaConfigurationFragment } from 'generated/graphql'
import { CD_ABS_PATH } from 'routes/cdRoutesConsts'
import { PR_DEFAULT_ABS_PATH } from 'routes/prRoutesConsts'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { useDefaultCDPath } from 'components/cd/ContinuousDeployment'
import { POLICIES_ABS_PATH } from 'routes/policiesRoutesConsts'

import { useLogin } from '../contexts'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import {
  STACKS_ABS_PATH,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts'

import { MARK_READ } from './queries'
import { NotificationsPanelOverlay } from './NotificationsPanelOverlay'

type MenuItem = {
  text: string
  icon: ReactElement
  path: string
  pathRegexp?: RegExp
  ignoreRegexp?: RegExp
  plural?: boolean
  enabled?: boolean
}

function getMenuItems({
  isCDEnabled,
  cdPath,
  isByok,
  personaConfig,
}: {
  isSandbox: boolean
  isCDEnabled: boolean
  cdPath: string
  isByok: boolean
  personaConfig: Nullable<PersonaConfigurationFragment>
}): MenuItem[] {
  return [
    {
      text: 'Home',
      icon: <HomeIcon />,
      path: '/home',
    },
    {
      text: 'Apps',
      icon: <AppsIcon />,
      path: '/',
      plural: true,
      pathRegexp: /^\/(apps)/,
    },
    {
      text: 'Continuous deployment',
      icon: <GitPullIcon />,
      path: cdPath,
      pathRegexp: /^(\/cd)|(\/cd\/.*)$/,
      ignoreRegexp: /^\/cd\/settings.*$/,
    },
    {
      text: 'Infrastructure stacks',
      icon: <StackIcon />,
      path: getStacksAbsPath(''),
    },
    {
      text: 'Kubernetes',
      icon: <KubernetesIcon />,
      path: `/${KUBERNETES_ROOT_PATH}`,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Builds',
      icon: <BuildIcon />,
      plural: true,
      path: '/builds',
    },
    {
      text: 'Nodes',
      icon: <ServersIcon />,
      path: '/nodes',
      plural: true,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Pods',
      icon: <ApiIcon />,
      path: '/pods',
      plural: true,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'PR',
      icon: <PrOpenIcon />,
      path: PR_DEFAULT_ABS_PATH,
      pathRegexp: /^(\/pr)|(\/pr\/.*)$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.pullRequests),
    },
    {
      text: 'Policies',
      icon: <WarningShieldIcon />,
      path: POLICIES_ABS_PATH,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Database management',
      icon: <DatabaseIcon />,
      plural: true,
      path: `/${DB_MANAGEMENT_PATH}`,
    },
    // ...(isSandbox
    //   ? []
    //   : [
    //       {
    //         text: 'Incidents',
    //         icon: <SirenIcon />,
    //         path: '/incidents',
    //         sandboxed: true,
    //       },
    //     ]),
    {
      text: 'Backups',
      icon: <HistoryIcon />,
      path: '/backups',
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.backups),
    },
    {
      text: 'Notifications',
      icon: <LightningIcon />,
      path: '/notifications',
      enabled: isCDEnabled,
    },
    {
      text: 'Deployment Settings',
      icon: <GearTrainIcon />,
      path: `${CD_ABS_PATH}/settings`,
      pathRegexp: /^\/cd\/settings.*$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.settings),
    },
    {
      text: 'Audits',
      icon: <ListIcon />,
      path: '/audits',
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.audits),
    },
    {
      text: 'Account',
      icon: <PeopleIcon />,
      path: '/account',
    },
  ].filter((item) => item.enabled !== false && (!item.plural || !isByok))
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

const SidebarSC = styled(DSSidebar).attrs(() => ({ variant: 'console' }))(
  (_) => ({
    flexGrow: 1,
    minHeight: 0,
    height: 'auto',
  })
)

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
  const sidebarWidth = 64
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
        isByok: !!configuration?.byok,
        personaConfig: personaConfiguration,
      }),
    [
      personaConfiguration,
      configuration?.isSandbox,
      configuration?.byok,
      isCDEnabled,
      defaultCDPath,
    ]
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

  if (!me) return null
  const unreadNotifications = me.unreadNotifications || 0

  return (
    <>
      <SidebarSC variant="console">
        <SidebarSection
          grow={1}
          shrink={1}
        >
          {menuItems.map((item, i) => (
            <SidebarItem
              key={i}
              clickable
              tooltip={item.text}
              className={`sidebar-${item.text}`}
              active={isActive(item)}
              as={Link}
              to={item.path}
            >
              {item.icon}
            </SidebarItem>
          ))}
          <Flex grow={1} />
          <SidebarItem
            tooltip="Discord"
            className="sidebar-discord"
            clickable
            as="a"
            target="_blank"
            rel="noopener noreferrer"
            href={DISCORD_LINK}
          >
            <DiscordIcon />
          </SidebarItem>
          <SidebarItem
            tooltip="GitHub"
            className="sidebar-github"
            clickable
            as="a"
            target="_blank"
            rel="noopener noreferrer"
            href={`${GITHUB_LINK}/plural`}
          >
            <GitHubLogoIcon />
          </SidebarItem>
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
          >
            <BellIcon />
            {unreadNotifications > 0 && (
              <NotificationsCountSC>
                {unreadNotifications > 99 ? '!' : unreadNotifications}
              </NotificationsCountSC>
            )}
          </SidebarItem>
          <SidebarItem
            ref={menuItemRef}
            className="sidebar-menu"
            active={isMenuOpen}
            clickable
            collapsed
            onClick={() => setIsMenuOpen((x) => !x)}
          >
            <Avatar
              name={me.name}
              src={me.profile}
              size={32}
            />
          </SidebarItem>
        </SidebarSection>
      </SidebarSC>
      {isMenuOpen && (
        <Menu
          ref={menuRef}
          zIndex={999}
          position="absolute"
          bottom={8}
          minWidth="175px"
          left={60 + 8}
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
      {/* ---
        NOTIFICATIONS PANEL
      --- */}
      <NotificationsPanelOverlay
        leftOffset={sidebarWidth}
        isOpen={isNotificationsPanelOpen}
        setIsOpen={setIsNotificationsPanelOpen}
      />
    </>
  )
}
