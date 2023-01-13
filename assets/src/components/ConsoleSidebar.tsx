import {
  AppsIcon,
  ArrowTopRightIcon,
  BuildIcon,
  DiscordIcon,
  GitHubLogoIcon,
  ListIcon,
  LogoutIcon,
  PeopleIcon,
  PersonIcon,
  ScrollIcon,
  ServersIcon,
  Sidebar,
  SidebarItem,
  SidebarSection,
  theme,
} from '@pluralsh/design-system'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
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
  useOutsideClick,
} from 'honorable'

import { wipeToken } from 'helpers/auth'

import { LoginContext } from './contexts'
import { Notifications } from './account/Notifications'
import { AutoRefresh, getCommit } from './AutoRefresh'

export const SIDEBAR_ICON_HEIGHT = '42px'

const MENU_ITEMS: any[] = [
  { text: 'Apps', icon: <AppsIcon />, path: '/' },
  { text: 'Builds', icon: <BuildIcon />, path: '/builds' },
  { text: 'Cluster', icon: <ServersIcon />, path: '/nodes' },
  // { text: 'Incidents', icon: <SirenIcon />, path: '/incidents', sandboxed: true }, Disabled for now.
  { text: 'Audits', icon: <ListIcon />, path: '/audits' },
  { text: 'Account', icon: <PeopleIcon />, path: '/directory' },
]

function SidebarMenuItem({ tooltip, href, children } : {tooltip: string, href?: string, children: JSX.Element}) {
  return (
    <SidebarItem
      clickable
      tooltip={tooltip}
      href={href}
      height={32}
      width={32}
    >
      {children}
    </SidebarItem>
  )
}

export default function ConsoleSidebar() {
  const menuItemRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpened] = useState<boolean>(false)
  const { me, configuration } = useContext<any>(LoginContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = ({ path }) => (path === '/'
    ? (pathname === path || pathname.startsWith('/apps/'))
    : pathname.startsWith(path))
  const menuItems = configuration.isSandbox ? MENU_ITEMS.filter(({ sanboxed }) => !sanboxed) : MENU_ITEMS

  useOutsideClick(menuRef, event => {
    if (!menuItemRef.current?.contains(event.target as any)) {
      setIsMenuOpened(false)
    }
  })

  const handleLogout = useCallback(() => {
    wipeToken()
    const w: Window = window

    w.location = '/login'
  }, [])

  if (!me) return null

  return (
    <>
      <Sidebar backgroundColor={theme.colors?.grey[950]}>
        <SidebarSection
          grow={1}
          shrink={1}
        >
          {menuItems.map((item, i) => (
            <SidebarItem
              key={i}
              clickable
              tooltip={item.text}
              onClick={() => navigate(item.path)}
              backgroundColor={active(item) ? theme.colors?.grey[875] : null}
              _hover={{ backgroundColor: theme.colors?.grey[900], cursor: 'pointer' }}
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
            href="https://discord.gg/bEBAMXV64s"
          >
            <DiscordIcon />
          </SidebarMenuItem>
          <SidebarMenuItem
            tooltip="GitHub"
            href="https://github.com/pluralsh/plural"
          >
            <GitHubLogoIcon />
          </SidebarMenuItem>
          <SidebarMenuItem tooltip="Notifications">
            <Notifications />
          </SidebarMenuItem>
          {getCommit() !== configuration.gitCommit && (
            <SidebarMenuItem tooltip="New update available">
              <AutoRefresh />
            </SidebarMenuItem>
          )}
          <SidebarItem
            ref={menuItemRef}
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
      </Sidebar>
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
            color="inherit"
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
            color="inherit"
            textDecoration="none"
          >
            <ScrollIcon marginRight="xsmall" />
            Docs
            <Flex flexGrow={1} />
            <ArrowTopRightIcon />
          </MenuItem>
          <MenuItem
            onClick={handleLogout}
            color="icon-error"
          >
            <LogoutIcon marginRight="xsmall" />
            Logout
          </MenuItem>
        </Menu>
      )}
    </>
  )
}
