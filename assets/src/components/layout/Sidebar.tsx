import {
  ApiIcon,
  AppsIcon,
  ArrowTopRightIcon,
  BellIcon,
  BuildIcon,
  Sidebar as DSSidebar,
  DatabaseIcon,
  DiscordIcon,
  GitHubLogoIcon,
  GitPullIcon,
  ListIcon,
  LogoutIcon,
  PeopleIcon,
  PersonIcon,
  ScrollIcon,
  ServersIcon,
  SidebarItem,
  SidebarSection,
} from '@pluralsh/design-system'
import { Link, useLocation } from 'react-router-dom'
import { ReactElement, useCallback, useContext, useRef, useState } from 'react'
import { Avatar, Flex, Menu, MenuItem, useOutsideClick } from 'honorable'
import { wipeToken } from 'helpers/auth'
import posthog from 'posthog-js'
import { ME_Q } from 'components/graphql/users'
import { useMutation } from '@apollo/client'
import { updateCache } from 'utils/graphql'
import styled from 'styled-components'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'

import { CD_BASE_PATH as CD_PATH } from 'routes/cdRoutes'

import { LoginContext } from '../contexts'

import { MARK_READ } from './queries'
import { NotificationsPanelOverlay } from './NotificationsPanelOverlay'

type MenuItem = {
  text: string
  icon: ReactElement
  path: string
  pathRegexp?: RegExp
  sandboxed?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  {
    text: 'Apps',
    icon: <AppsIcon />,
    path: '/',
    pathRegexp: /^\/(apps)/,
  },
  {
    text: 'Builds',
    icon: <BuildIcon />,
    path: '/builds',
  },
  {
    text: 'Nodes',
    icon: <ServersIcon />,
    path: '/nodes',
  },
  {
    text: 'Pods',
    icon: <ApiIcon />,
    path: '/pods',
  },
  {
    text: 'Continuous deployment',
    icon: <GitPullIcon />,
    path: `/${CD_PATH}`,
  },
  {
    text: 'Database management',
    icon: <DatabaseIcon />,
    path: `/${DB_MANAGEMENT_PATH}`,
  },
  // { text: 'Incidents', icon: <SirenIcon />, path: '/incidents', sandboxed: true },
  {
    text: 'Audits',
    icon: <ListIcon />,
    path: '/audits',
  },
  {
    text: 'Account',
    icon: <PeopleIcon />,
    path: '/account',
  },
]

function isActiveMenuItem(
  { path, pathRegexp }: Pick<MenuItem, 'path' | 'pathRegexp'>,
  currentPath
) {
  return (
    (path === '/' ? currentPath === path : currentPath.startsWith(path)) ||
    (pathRegexp && (currentPath.match(pathRegexp)?.length ?? 0 > 0))
  )
}

const SidebarSC = styled(DSSidebar).attrs(() => ({ variant: 'console' }))``
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
}))

export default function Sidebar() {
  const menuItemRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] =
    useState(false)
  const sidebarWidth = 64
  const { me, configuration } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const isActive = useCallback(
    (menuItem: Parameters<typeof isActiveMenuItem>[0]) =>
      isActiveMenuItem(menuItem, pathname),
    [pathname]
  )
  const menuItems = configuration.isSandbox
    ? MENU_ITEMS.filter(({ sandboxed }) => !sandboxed)
    : MENU_ITEMS

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

  const handleLogout = useCallback(() => {
    setIsMenuOpen(false)
    wipeToken()
    posthog.reset()
    const w: Window = window

    w.location = '/login'
  }, [])

  useOutsideClick(menuRef, (event) => {
    if (!menuItemRef.current?.contains(event.target as any)) {
      setIsMenuOpen(false)
    }
  })

  useOutsideClick(notificationsPanelRef, () => toggleNotificationPanel(false))

  if (!me) return null

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
            href="https://discord.gg/bEBAMXV64s"
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
            href="https://github.com/pluralsh/plural"
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
            badge={me?.unreadNotifications}
            active={isNotificationsPanelOpen}
          >
            <BellIcon />
            {me?.unreadNotifications > 0 && (
              <NotificationsCountSC>
                {me.unreadNotifications > 99 ? '!' : me.unreadNotifications}
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
