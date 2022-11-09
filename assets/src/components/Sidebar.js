import { AppsIcon, DiscordIcon, DocumentIcon, GitHubLogoIcon, ListIcon, PeopleIcon, ServersIcon,
  Sidebar, SidebarItem, SidebarSection, SirenIcon } from 'pluralsh-design-system'

import { Builds } from 'forge-core'
import { useHistory, useLocation } from 'react-router'

export const SIDEBAR_ICON_HEIGHT = '42px'

// function Me({ expanded }) {
//   const history = useHistory()
//   const { me } = useContext(LoginContext)
//   if (!me) return null

//   return (
//     <Box
//       flex={false}
//       direction="row"
//       gap="xsmall"
//       align="center"
//       pad="xsmall"
//       hoverIndicator="sidebarHover"
//       round="3px"
//       justify={expanded ? null : 'center'}
//       onClick={() => history.push('/me/edit')}
//     >
//       <Avatar
//         user={me}
//         size={expanded ? '45px' : '35px'}
//       />
//       {expanded && (
//         <Box>
//           <Text
//             size="small"
//             color="light-5"
//             truncate
//           >{me.name}
//           </Text>
//           <Text size="small">{me.email}</Text>
//         </Box>
//       )}
//     </Box>
//   )
// }

const MENU_ITEMS = [
  { text: 'Apps', icon: <AppsIcon />, path: '/' },
  { text: 'Builds',
    icon: <Builds
      size="16px"
      color="white"
    />, // TODO: Move to design system.
    path: '/builds' },
  { text: 'Nodes', icon: <ServersIcon />, path: '/nodes' },
  { text: 'Incidents', icon: <SirenIcon />, path: '/incidents' },
  { text: 'Audits', name: 'audits', icon: <ListIcon />, path: '/audits' },
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
  const history = useHistory()
  const { pathname } = useLocation()
  const active = ({ path }) => path === '/' ? pathname === path : pathname.startsWith(path)

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
        )
        )}
      </SidebarSection>
      <SidebarSection>
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
      </SidebarSection>
    </Sidebar>
    //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
    //     <Me expanded={isExpanded} />
  )
}
