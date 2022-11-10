import {
  AppsIcon,
  Avatar,
  DiscordIcon,
  DocumentIcon,
  GitHubLogoIcon,
  ListIcon,
  PeopleIcon,
  ServersIcon,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SirenIcon,
} from 'pluralsh-design-system'

import { Builds } from 'forge-core'
import { useHistory, useLocation } from 'react-router'

import { useContext } from 'react'

import { Flex } from 'honorable'

import { LoginContext } from './contexts'

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
  { text: 'Incidents', icon: <SirenIcon />, path: '/incidents' },
  {
    text: 'Audits', name: 'audits', icon: <ListIcon />, path: '/audits',
  },
  { text: 'Account', icon: <PeopleIcon />, path: '/directory' },

  // { text: 'Runbooks', icon: Runbook, path: '/runbooks/{repo}' },
  // { text: 'Components', icon: Components, path: '/components/{repo}' },
  // { text: 'Configuration', icon: Configuration, path: '/config/{repo}', git: true },
  // { text: 'Dashboards', icon: Dashboard, path: '/dashboards/{repo}' },
  // { text: 'Logs', icon: Logs, path: '/logs/{repo}' },

  // {text: 'Webhooks', icon: Webhooks, path: '/webhooks'},
]

// const replace = (path, name) => path.replace('{repo}', name)

export default function ConsoleSidebar() {
  const { me } = useContext(LoginContext)
  const history = useHistory()
  const { pathname } = useLocation()
  const active = ({ path }) => (path === '/' ? pathname === path : pathname.startsWith(path))

  if (!me) return null

  // const { currentApplication } = useContext(InstallationContext)
  // const { configuration: conf } = useContext(LoginContext)
  // const name = currentApplication && currentApplication.name

  return (
    <Sidebar>
      <SidebarSection grow={1}>
        {MENU_ITEMS.map((item, i) => (
          <SidebarItem
            key={i}
            clickable
            tooltip={item.text}
            onClick={() => history.push(item.path)}
            backgroundColor={active(item) ? 'fill-zero-selected' : null} // TODO: Add active prop to design system.
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
          tooltip="Documentation"
          href="https://docs.plural.sh/"
        >
          <DocumentIcon />
        </SidebarItem>
        <SidebarItem
          clickable
          onClick={() => history.push('/me/edit')}
        >
          <Avatar
            name={me.name}
            size={32}
          />
          {/* TODO: Switch to app icon component to make it gray? */}
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
    //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
  )
}
