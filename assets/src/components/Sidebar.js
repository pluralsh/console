import React, { useContext } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Deploy, Network, Configure, BarChart, Group, TextAlignFull, Cubes, List, Nodes, Alert, Book } from 'grommet-icons'
import { Box, Text } from 'grommet'
import { Next, Down } from 'grommet-icons' 
import { LoginContext } from './Login'
import Avatar from './users/Avatar'
import { InstallationContext } from './Installations'
import './sidebar.css'
import { SubmenuContext, Submenu } from './navigation/Submenu'
import { TOOLBAR_HEIGHT } from './Console'

export const SIDEBAR_ICON_HEIGHT = '42px'
const APP_ICON = `${process.env.PUBLIC_URL}/console-full.png`

export function SidebarIcon({icon, text, name: sidebarName, selected, path}) {
  const {name} = useContext(SubmenuContext)
  let history = useHistory()
  const inSubmenu = name === sidebarName
  const textColor = selected && !inSubmenu ? 'white' : 'tone-medium'

  return (
    <Box flex={false} fill='horizontal' background={(selected && !inSubmenu) ? 'sidebarHover' : null} round='xsmall'>
      <Box focusIndicator={false} fill='horizontal' align='center' direction='row' 
        round='xsmall' height={SIDEBAR_ICON_HEIGHT}
        hoverIndicator='sidebarHover' onClick={!inSubmenu && selected ? null : () => history.push(path)} 
        pad={{horizontal: 'small'}}>
        <Box direction='row' align='center' gap='15px' fill='horizontal'>
          {icon}
          <Text size='small' color={textColor}>{text}</Text>
        </Box>
        {sidebarName && !selected && <Next size='12px' />}
        {sidebarName && selected  && <Down size='12px' />}
      </Box>
      {selected && <Submenu />}
    </Box>
  )
}

function Me() {
  let history = useHistory()
  const {me} = useContext(LoginContext)
  if (!me) return null

  return (
    <Box flex={false} direction='row' gap='xsmall' align='center' pad='xsmall'
         hoverIndicator='sidebarHover' round='xsmall'
         onClick={() => history.push('/me/edit')}>
      <Avatar user={me} size='45px' />
      <Box>
        <Text size='small' truncate>{me.name}</Text>
        <Text size='small'>{me.email}</Text>
      </Box>
    </Box>
  )
}

const ICON_HEIGHT = '18px'

const OPTIONS = [
  {text: 'Builds', icon: <Deploy size={ICON_HEIGHT} />, path: '/'},
  {text: 'Runbooks', icon: <Book size={ICON_HEIGHT} />, path: '/runbooks/{repo}'},
  {text: 'Components', icon: <Cubes size={ICON_HEIGHT} />, path: '/components/{repo}'},
  {text: 'Nodes', icon: <Nodes size={ICON_HEIGHT} />, path: '/nodes'},
  {text: 'Configuration', icon: <Configure size={ICON_HEIGHT} />, path: '/config/{repo}' },
  {text: 'Incidents', icon: <Alert size={ICON_HEIGHT} />, path: '/incidents'},
  {text: 'Dashboards', icon: <BarChart size={ICON_HEIGHT} />, path: '/dashboards/{repo}'},
  {text: 'Logs', icon: <TextAlignFull size={ICON_HEIGHT} />, path: '/logs/{repo}'},
  {text: "Users", icon: <Group size={ICON_HEIGHT} />, path: '/directory'},
  {text: "Audits", name: 'audits', icon: <List size={ICON_HEIGHT} />, path: '/audits'},
  {text: 'Webhooks', icon: <Network size={ICON_HEIGHT} />, path: '/webhooks'},
]

const IMAGE_HEIGHT='47px'

const replace = (path, name) => path.replace('{repo}', name)

export default function Sidebar() {
  const loc = useLocation()
  const {currentApplication} = useContext(InstallationContext)

  const name = currentApplication && currentApplication.name
  const active = OPTIONS.findIndex(({path}) => {
    if (path === '/') return loc.pathname === path
    return loc.pathname.startsWith(replace(path, name))
  })

  return (
    <Box background='sidebar' height='100vh' fill='horizontal'>
      <Box flex={false} direction='row' align='center' pad={{horizontal: 'small'}} 
           border={{side: 'bottom', color: 'sidebarBorder'}} height={TOOLBAR_HEIGHT}>
        <img height={IMAGE_HEIGHT} alt='' src={APP_ICON} />
      </Box>
      <Box fill align='center' border={{side: 'right', color: 'sidebarBorder'}}
           style={{overflow: 'auto'}} pad='small'>
        <Box flex={false} fill='horizontal' gap='3px'>
          {OPTIONS.map(({text, icon, path, name: sbName}, ind) => (
            <SidebarIcon
              key={ind}
              icon={icon}
              path={replace(path, name)}
              text={text}
              name={sbName}
              selected={ind === active} />
          ))}
        </Box>
      </Box>
      <Box pad='small' flex={false}>
        <Me />
      </Box>
    </Box>
  )
}