import React, { useContext } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Previous, Menu } from 'grommet-icons'
import { Builds, Components, Nodes, Configuration, Incidents, Dashboard, Logs, Audits, Group, Runbook } from 'forge-core'
import { Box, Text, Drop } from 'grommet'
import { Next, Down } from 'grommet-icons' 
import { LoginContext } from './Login'
import Avatar from './users/Avatar'
import { InstallationContext } from './Installations'
import './sidebar.css'
import { SubmenuContext, Submenu } from './navigation/Submenu'
import { SIDEBAR_WIDTH } from './Console'
import styled from 'styled-components'
import { normalizeColor } from 'grommet/utils'
import { useState } from 'react'

const hoverable = styled.div`
  &:hover span {
    color: ${props => normalizeColor('white', props.theme)};
  }

  &:hover svg {
    stroke: ${props => normalizeColor('white', props.theme)} !important;
    fill: ${props => normalizeColor('white', props.theme)} !important;
  }
`

export const SIDEBAR_ICON_HEIGHT = '42px'
const SMALL_WIDTH = '60px'
const ICON_HEIGHT = '15px'

export function SidebarIcon({icon, text, name: sidebarName, selected, path}) {
  const {name} = useContext(SubmenuContext)
  let history = useHistory()
  const inSubmenu = name === sidebarName
  const textColor = selected && !inSubmenu ? 'white' : 'light-5'

  return (
    <Box as={hoverable} flex={false} fill='horizontal' 
         background={(selected && !inSubmenu) ? 'sidebarHover' : null}>
      <Box focusIndicator={false} fill='horizontal' align='center' direction='row' 
        height={SIDEBAR_ICON_HEIGHT} hoverIndicator='sidebarHover' 
        onClick={!inSubmenu && selected ? null : () => history.push(path)} 
        pad={{horizontal: 'small'}}>
        <Box direction='row' align='center' gap='15px' fill='horizontal'>
          {React.createElement(icon, {size: ICON_HEIGHT, color: textColor})}
          <Text size='small' color={textColor}>{text}</Text>
        </Box>
        {sidebarName && !selected && <Next size='12px' />}
        {sidebarName && selected  && <Down size='12px' />}
      </Box>
      {selected && <Submenu />}
    </Box>
  )
}

function CompressedIcon({icon, text, selected, path, git}) {
  const [ref, setRef] = useState(null)
  const [hover, setHover] = useState(false)
  let history = useHistory()

  return (
    <>
      <Box ref={setRef} focusIndicator={false} align='center' justify='center' direction='row' 
        height={SIDEBAR_ICON_HEIGHT} width={SIDEBAR_ICON_HEIGHT} hoverIndicator='sidebarHover' 
        background={selected ? 'sidebarHover' : null} margin={{top: 'xsmall'}}
        onClick={selected ? null : () => history.push(path)} 
        round='3px'
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}>
        {React.createElement(icon, {color: 'white', size: ICON_HEIGHT})}
      </Box>
      {hover && ref && (
        <Drop plain target={ref} align={{left: "right"}} margin={{left: 'xsmall'}}>
          <Box round='3px' height={SIDEBAR_ICON_HEIGHT} background='sidebarHover' 
              pad={{horizontal: 'small'}} elevation='small' align='center' justify='center'>
            <Text size='small' weight={500}>{text}</Text>
          </Box>
        </Drop>
      )}
    </>
  )  
}

function Me({expanded}) {
  let history = useHistory()
  const {me} = useContext(LoginContext)
  if (!me) return null

  return (
    <Box flex={false} direction='row' gap='xsmall' align='center' pad='xsmall'
         hoverIndicator='sidebarHover' round='3px' justify={expanded ? null : 'center'}
         onClick={() => history.push('/me/edit')}>
      <Avatar user={me} size={expanded ? '45px' : '35px'} />
      {expanded && (
        <Box>
          <Text size='small' color='light-5' truncate>{me.name}</Text>
          <Text size='small'>{me.email}</Text>
        </Box>
      )}
    </Box>
  )
}


const OPTIONS = [
  {text: 'Builds', icon: Builds, path: '/'},
  {text: 'Runbooks', icon: Runbook, path: '/runbooks/{repo}'},
  {text: 'Components', icon: Components, path: '/components/{repo}'},
  {text: 'Nodes', icon: Nodes, path: '/nodes'},
  {text: 'Configuration', icon: Configuration, path: '/config/{repo}', git: true},
  {text: 'Incidents', icon: Incidents, path: '/incidents'},
  {text: 'Dashboards', icon: Dashboard, path: '/dashboards/{repo}'},
  {text: 'Logs', icon: Logs, path: '/logs/{repo}'},
  {text: "Account", icon: Group, path: '/directory'},
  {text: "Audits", name: 'audits', icon: Audits, path: '/audits'},
  // {text: 'Webhooks', icon: Webhooks, path: '/webhooks'},
]

const replace = (path, name) => path.replace('{repo}', name)

const animation = {
  transition: 'width 0.75s cubic-bezier(0.000, 0.795, 0.000, 1.000)'
}

function Collapse({setExpanded}) {
  return (
    <Box direction='row' fill='horizontal' align='center' gap='xsmall' round='3px'
          pad='xsmall' hoverIndicator='sidebarHover' onClick={() => setExpanded(false)}>
      <Previous size='15px' />
      <Text size='small'>Collapse</Text>
    </Box>
  )
}

function Expand({setExpanded}) {
  return (
    <Box pad='xsmall' align='center' justify='center' hoverIndicator='sidebarHover'
         onClick={() => setExpanded(true)} round='3px'>
      <Menu size='15px' />
    </Box>
  )
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const loc = useLocation()
  const {currentApplication} = useContext(InstallationContext)
  const {configuration: conf} = useContext(LoginContext)

  const name = currentApplication && currentApplication.name
  const active = OPTIONS.findIndex(({path}) => {
    if (path === '/') return loc.pathname === path
    return loc.pathname.startsWith(replace(path, name))
  })
  const isExpanded = expanded || (active >= 0 && !!OPTIONS[active].name)

  return (
    <Box flex={false} background='sidebar' fill='vertical' style={animation} 
         width={isExpanded ? SIDEBAR_WIDTH : SMALL_WIDTH}>
      <Box fill align='center' border={{side: 'right', color: 'sidebarBorder'}}
           style={{overflow: 'auto'}}>
        <Box flex={false} fill='horizontal' align='center'>
          {OPTIONS.map(({text, icon, path, name: sbName, git}, ind) => {
            if (git && !conf.gitStatus.cloned) return null 
            return isExpanded ? <SidebarIcon
                          key={ind}
                          icon={icon}
                          path={replace(path, name)}
                          text={text}
                          name={sbName}
                          selected={ind === active} /> :
              <CompressedIcon 
                key={ind}
                icon={icon}
                path={replace(path, name)}
                text={text}
                name={sbName}
                selected={ind === active} />
          })}
        </Box>
      </Box>
      <Box pad='xsmall' flex={false} gap='xsmall' margin={{bottom: 'small'}}>
        <Me expanded={isExpanded} />
        {isExpanded && <Collapse setExpanded={setExpanded} />}
        {!isExpanded && <Expand setExpanded={setExpanded} />}
      </Box>
    </Box>
  )
}