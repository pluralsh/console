import {
  AppsIcon,
  Avatar,
  DiscordIcon,
  GitHubLogoIcon,
  ListIcon,
  PeopleIcon,
  ServersIcon,
  Sidebar,
  SidebarItem,
  SidebarSection,
  theme,
} from '@pluralsh/design-system'

import { Builds } from 'forge-core'
import { useLocation, useNavigate } from 'react-router-dom'

import { useContext } from 'react'

import { Flex } from 'honorable'

import { LoginContext } from './contexts'
import { Notifications } from './users/Notifications'

export const SIDEBAR_ICON_HEIGHT = '42px'

const MENU_ITEMS = [
  { text: 'Apps', icon: <AppsIcon />, path: '/' },
  {
    text: 'Builds',
    icon: <Builds
      size="16px"
      color="white"
    />, // TODO: Move to design system.
    path: '/builds',
  },
  { text: 'Nodes', icon: <ServersIcon />, path: '/nodes' },
  // { text: 'Incidents', icon: <SirenIcon />, path: '/incidents' }, // Disabled for now.
  {
    text: 'Audits', name: 'audits', icon: <ListIcon />, path: '/audits',
  },
  { text: 'Account', icon: <PeopleIcon />, path: '/directory' },

  // {text: 'Webhooks', icon: Webhooks, path: '/webhooks'},
]

export default function ConsoleSidebar() {
  const { me } = useContext(LoginContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = ({ path }) => (path === '/'
    ? (pathname === path || pathname.startsWith('/apps/'))
    : pathname.startsWith(path))

  if (!me) return null

  return (
    <Sidebar backgroundColor={theme.colors.grey[950]}>
      <SidebarSection
        grow={1}
        shrink={1}
      >
        {MENU_ITEMS.map((item, i) => (
          <SidebarItem
            key={i}
            clickable
            tooltip={item.text}
            onClick={() => navigate(item.path)}
            backgroundColor={active(item) ? theme.colors.grey[875] : null} // TODO: Add active prop to design system.
            _hover={{ backgroundColor: theme.colors.grey[900], cursor: 'pointer' }}
            borderRadius="normal"
          >
            {item.icon}
          </SidebarItem>
        ))}
        <Flex grow={1} />
        <SidebarItem
          clickable
          tooltip="Discord"
          href="https://discord.gg/bEBAMXV64s"
        >
          <DiscordIcon />
        </SidebarItem>
        <SidebarItem
          clickable
          tooltip="GitHub"
          href="https://github.com/pluralsh/plural"
        >
          <GitHubLogoIcon />
        </SidebarItem>
        <SidebarItem
          clickable
          tooltip="Notifications"
        >
          <Notifications />
        </SidebarItem>
        <SidebarItem
          clickable
          onClick={() => navigate('/me/edit')}
        >
          <Avatar
            name={me.name}
            size={32}
          />
          {/* TODO: Switch to app icon component to make it gray? */}
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
}
