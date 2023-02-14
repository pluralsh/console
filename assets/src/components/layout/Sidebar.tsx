import {
  ApiIcon,
  AppsIcon,
  ArrowTopRightIcon,
  BellIcon,
  BuildIcon,
  Sidebar as DSSidebar,
  DiscordIcon,
  GitHubLogoIcon,
  ListIcon,
  LogoutIcon,
  PeopleIcon,
  PersonIcon,
  ScrollIcon,
  ServersIcon,
  SidebarItem,
  SidebarSection,
} from '@pluralsh/design-system'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  ReactElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'

import {
  Avatar,
  Flex,
  Menu,
  MenuItem,
  Span,
  useOutsideClick,
} from 'honorable'

import { wipeToken } from 'helpers/auth'

import { ME_Q } from 'components/graphql/users'

import { useMutation } from '@apollo/client'

import { updateCache } from 'utils/graphql'

import { useTheme } from 'styled-components'

import { LoginContext } from '../contexts'

import { MARK_READ } from './queries'
import { NotificationsPanelOverlay } from './NotificationsPanelOverlay'

export const SIDEBAR_ICON_HEIGHT = '42px'

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

function SidebarMenuItem({
  tooltip,
  href,
  className,
  children,
}: {
  tooltip: string
  href?: string
  className?: string
  children: JSX.Element
}) {
  return (
    <SidebarItem
      clickable
      tooltip={tooltip}
      href={href}
      height={32}
      width={32}
      className={className}
    >
      {children}
    </SidebarItem>
  )
}

function isActiveMenuItem({ path, pathRegexp }: Pick<MenuItem, 'path' | 'pathRegexp'>,
  currentPath) {
  return (
    (path === '/' ? currentPath === path : currentPath.startsWith(path))
    || (pathRegexp && (currentPath.match(pathRegexp)?.length ?? 0 > 0))
  )
}

export default function Sidebar() {
  const menuItemRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpened] = useState<boolean>(false)
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen]
    = useState(false)
  const sidebarWidth = 65 // 64 + 1px border
  const { me, configuration } = useContext<any>(LoginContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = useCallback((menuItem: Parameters<typeof isActiveMenuItem>[0]) => isActiveMenuItem(menuItem, pathname),
    [pathname])
  const menuItems = configuration.isSandbox
    ? MENU_ITEMS.filter(({ sandboxed }) => !sandboxed)
    : MENU_ITEMS

  const theme = useTheme()

  const [mutation] = useMutation(MARK_READ, {
    update: cache => updateCache(cache, {
      query: ME_Q,
      update: ({ me, ...rest }) => ({
        ...rest,
        me: { ...me, unreadNotifications: 0 },
      }),
    }),
  })

  const toggleNotificationPanel = useCallback(open => {
    if (!open) mutation()
    setIsNotificationsPanelOpen(open)
  },
  [mutation, setIsNotificationsPanelOpen])

  const handleLogout = useCallback(() => {
    setIsMenuOpened(false)
    wipeToken()
    const w: Window = window

    w.location = '/login'
  }, [])

  useOutsideClick(menuRef, event => {
    if (!menuItemRef.current?.contains(event.target as any)) {
      setIsMenuOpened(false)
    }
  })

  useOutsideClick(notificationsPanelRef, () => toggleNotificationPanel(false))

  if (!me) return null

  return (
    <>
      <DSSidebar backgroundColor={theme.colors?.grey[950]}>
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
              onClick={() => navigate(item.path)}
              backgroundColor={active(item) ? theme.colors?.grey[875] : null}
              _hover={{
                backgroundColor: theme.colors?.grey[900],
                cursor: 'pointer',
              }}
              borderRadius="normal"
              height={32}
              width={32}
            >
              {item.icon}
            </SidebarItem>
          ))}
          <Flex grow={1} />
          <SidebarMenuItem
            tooltip="Discord"
            className="sidebar-discord"
            href="https://discord.gg/bEBAMXV64s"
          >
            <DiscordIcon />
          </SidebarMenuItem>
          <SidebarMenuItem
            tooltip="GitHub"
            className="sidebar-github"
            href="https://github.com/pluralsh/plural"
          >
            <GitHubLogoIcon />
          </SidebarMenuItem>
          <SidebarItem
            position="relative"
            clickable
            label="Notifications"
            tooltip="Notifications"
            className="sidebar-notifications"
            onClick={event => {
              event.stopPropagation()
              toggleNotificationPanel(!isNotificationsPanelOpen)
            }}
            badge={me?.unreadNotifications}
            backgroundColor={
              isNotificationsPanelOpen ? theme.colors?.grey[875] : null
            }
            width={32}
            height={32}
          >
            <BellIcon />
            {me?.unreadNotifications > 0 && (
              <Flex
                color="white"
                backgroundColor="error"
                borderRadius="100%"
                fontSize={11}
                align="start"
                justify="center"
                height={15}
                width={15}
                position="absolute"
                left={16}
                top={2}
              >
                <Span marginTop={-2}>
                  {me.unreadNotifications > 99 ? '!' : me.unreadNotifications}
                </Span>
              </Flex>
            )}
          </SidebarItem>
          <SidebarItem
            ref={menuItemRef}
            className="sidebar-menu"
            py={0.25 / 2}
            px={0.5}
            active={isMenuOpen}
            clickable
            collapsed
            onClick={() => setIsMenuOpened(x => !x)}
          >
            <Avatar
              name={me.name}
              src={me.profile}
              size={32}
            />
          </SidebarItem>
        </SidebarSection>
      </DSSidebar>
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
            onClick={() => setIsMenuOpened(false)}
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
            onClick={() => setIsMenuOpened(false)}
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
      {isNotificationsPanelOpen && (
        <NotificationsPanelOverlay
          leftOffset={sidebarWidth}
          isOpen={isNotificationsPanelOpen}
          setIsOpen={setIsNotificationsPanelOpen}
        />
      )}
    </>
  )
}
