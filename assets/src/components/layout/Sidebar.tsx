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
  SidebarExpandButton,
  SidebarExpandWrapper,
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
import styled, { useTheme } from 'styled-components'

import { PersonaConfigurationFragment } from 'generated/graphql'
import { CD_ABS_PATH } from 'routes/cdRoutesConsts'
import { PR_DEFAULT_ABS_PATH } from 'routes/prRoutesConsts'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { useDefaultCDPath } from 'components/cd/ContinuousDeployment'

import { POLICIES_ABS_PATH } from 'routes/policiesRoutesConsts'

import { isEmpty } from 'lodash'

import { useLogin } from '../contexts'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

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
  expandedLabel: string
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
  const showStacks = !isEmpty(localStorage.getItem(`plural-stacks`))

  return [
    {
      text: 'Home',
      expandedLabel: 'Home',
      icon: <HomeIcon />,
      path: '/home',
    },
    {
      text: 'Apps',
      expandedLabel: 'Apps',
      icon: <AppsIcon />,
      path: '/',
      plural: true,
      pathRegexp: /^\/(apps)/,
    },
    {
      text: 'Continuous deployment',
      expandedLabel: 'CD',
      icon: <GitPullIcon />,
      path: cdPath,
      pathRegexp: /^(\/cd)|(\/cd\/.*)$/,
      ignoreRegexp: /^\/cd\/settings.*$/,
    },
    ...(showStacks
      ? [
          {
            text: 'Stacks',
            expandedLabel: 'Stacks',
            icon: <StackIcon />,
            path: getStacksAbsPath(''),
          },
        ]
      : []),
    {
      text: 'Kubernetes',
      expandedLabel: 'Kubernetes',
      icon: <KubernetesIcon />,
      path: `/${KUBERNETES_ROOT_PATH}`,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Builds',
      expandedLabel: 'Builds',
      icon: <BuildIcon />,
      plural: true,
      path: '/builds',
    },
    {
      text: 'Nodes',
      expandedLabel: 'Nodes',
      icon: <ServersIcon />,
      path: '/nodes',
      plural: true,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Pods',
      expandedLabel: 'Pods',
      icon: <ApiIcon />,
      path: '/pods',
      plural: true,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'PR',
      expandedLabel: 'PRs',
      icon: <PrOpenIcon />,
      path: PR_DEFAULT_ABS_PATH,
      pathRegexp: /^(\/pr)|(\/pr\/.*)$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.pullRequests),
    },
    {
      text: 'Policies',
      expandedLabel: 'Policies',
      icon: <WarningShieldIcon />,
      path: POLICIES_ABS_PATH,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Database management',
      expandedLabel: 'Databases',
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
      expandedLabel: 'Backups',
      icon: <HistoryIcon />,
      path: '/backups',
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.backups),
    },
    {
      text: 'Notifications',
      expandedLabel: 'Notifications',
      icon: <LightningIcon />,
      path: '/notifications',
      enabled: isCDEnabled,
    },
    {
      text: 'Deployment Settings',
      expandedLabel: 'Settings',
      icon: <GearTrainIcon />,
      path: `${CD_ABS_PATH}/settings`,
      pathRegexp: /^\/cd\/settings.*$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.settings),
    },
    {
      text: 'Audits',
      expandedLabel: 'Audits',
      icon: <ListIcon />,
      path: '/audits',
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.audits),
    },
    {
      text: 'Account',
      expandedLabel: 'Account',
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

  const theme = useTheme()

  if (!me) return null
  const unreadNotifications = me.unreadNotifications || 0

  return (
    <SidebarSC
      variant="console"
      css={{
        zIndex: theme.zIndexes.selectPopover,
      }}
    >
      <SidebarExpandWrapper pathname={pathname}>
        <SidebarSection
          grow={1}
          shrink={1}
          border="none"
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
              expandedLabel={item.expandedLabel}
            >
              {item.icon}
            </SidebarItem>
          ))}
          <Flex grow={1} />
          <SidebarExpandButton />
          <SidebarItem
            tooltip="Discord"
            className="sidebar-discord"
            clickable
            as="a"
            target="_blank"
            rel="noopener noreferrer"
            href={DISCORD_LINK}
            expandedLabel="Discord"
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
          <SidebarItem
            ref={menuItemRef}
            className="sidebar-menu"
            active={isMenuOpen}
            clickable
            collapsed
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
