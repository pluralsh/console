import React, { useState, useRef, useContext } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Deploy, Network, Configure, BarChart, Group, TextAlignFull, Cubes, List, Nodes, Alert } from 'grommet-icons'
import { Box, Text } from 'grommet'
import { LoginContext } from './Login'
import { Avatar } from './EditUser'
import { InstallationContext } from './Installations'
import { Tooltip } from './utils/Tooltip'
import './sidebar.css'

const SIDEBAR_ICON_HEIGHT = '45px'
const APP_ICON = `${process.env.PUBLIC_URL}/console-white.png`

function SidebarIcon({icon, text, selected, path}) {
  const dropRef = useRef()
  let history = useHistory()
  const [hover, setHover] = useState(false)

  return (
    <>
    <Box
      ref={dropRef}
      focusIndicator={false}
      className={'sidebar-icon' + (selected ? ' selected' : '')}
      align='center'
      justify='center'
      margin={{horizontal: 'xsmall'}}
      round='xsmall'
      height={SIDEBAR_ICON_HEIGHT}
      hoverIndicator='sidebarHover'
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => history.push(path)}
      background={selected ? 'black' : null}
      direction='row'>
      {icon}
    </Box>
    {hover  && (
      <Tooltip pad='small' round='xsmall' justify='center' target={dropRef} side='right' align={{left: 'right'}}>
        <Text size='small' weight={500}>{text}</Text>
      </Tooltip>
    )}
    </>
  )
}

function Me() {
  let history = useHistory()
  const {me} = useContext(LoginContext)
  if (!me) return null

  return (
    <Box pad='small'>
      <Avatar me={me} size='42px' onClick={() => history.push('/me/edit')} />
    </Box>
  )
}

const ICON_HEIGHT = '18px'

const OPTIONS = [
  {text: 'Builds', icon: <Deploy size={ICON_HEIGHT} />, path: '/'},
  {text: 'Components', icon: <Cubes size={ICON_HEIGHT} />, path: '/components/{repo}'},
  {text: 'Nodes', icon: <Nodes size={ICON_HEIGHT} />, path: '/nodes'},
  {text: 'Configuration', icon: <Configure size={ICON_HEIGHT} />, path: '/config/{repo}' },
  {text: 'Incidents', icon: <Alert size={ICON_HEIGHT} />, path: '/incidents'},
  {text: 'Dashboards', icon: <BarChart size={ICON_HEIGHT} />, path: '/dashboards/{repo}'},
  {text: 'Logs', icon: <TextAlignFull size={ICON_HEIGHT} />, path: '/logs/{repo}'},
  {text: "Users", icon: <Group size={ICON_HEIGHT} />, path: '/directory'},
  {text: "Audits", icon: <List size={ICON_HEIGHT} />, path: '/audits'},
  {text: 'Webhooks', icon: <Network size={ICON_HEIGHT} />, path: '/webhooks'},
]

const IMAGE_HEIGHT='35px'

const replace = (path, name) => path.replace('{repo}', name)

export default function Sidebar() {
  const loc = useLocation()
  const {currentApplication} = useContext(InstallationContext)
  const name = currentApplication && currentApplication.name
  const active = OPTIONS.findIndex(({path}) => replace(path, name) === loc.pathname)

  return (
    <Box background='sidebar' height='100vh'>
      <Box flex={false} height={IMAGE_HEIGHT} justify='center' align='center' pad='small' margin={{vertical: 'small'}}>
        <img height={IMAGE_HEIGHT} alt='' src={APP_ICON} />
      </Box>
      <Box fill='vertical' justify='center'>
      {OPTIONS.map(({text, icon, path}, ind) => (
        <SidebarIcon
          key={ind}
          icon={icon}
          path={replace(path, name)}
          text={text}
          selected={ind === active} />
      ))}
      </Box>
      <Box height='70px' flex={false}>
        <Me />
      </Box>
    </Box>
  )
}