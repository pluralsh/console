import React, { useState } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import { Box, Text } from 'grommet'
import { useHistory } from 'react-router'
import Sidebar, { SIDEBAR_ICON_HEIGHT } from './Sidebar'
import Builds from './Builds'
import Build from './Build'
import BreadcrumbProvider, { Breadcrumbs } from './Breadcrumbs'
import Webhooks from './Webhooks'
import Configuration from './Configuration'
import Dashboards from './Dashboards'
import { EnsureLogin } from './Login'
import Users from './Users'
import { Installations, InstallationsFlyout, InstallationsProvider } from './Installations'
import { LogViewer } from './Logs'
import RepositorySelector from './RepositorySelector'
import Application from './Application'
import Component from './kubernetes/Component'
import { Node, Nodes } from './kubernetes/Node'
import { Pod } from './kubernetes/Pod'
import Directory from './users/Directory'
import EditUser from './users/EditUser'
import { Audits } from './audits/Audits'
import { withPluralApi } from './PluralApi'
import { Incidents } from './incidents/Incidents'
import { Incident } from './incidents/Incident'
import { AutoRefresh } from './AutoRefresh'
import { Explore } from 'forge-core'
import { Installer } from './repos/Installer'
import { Runbook } from './runbooks/Runbook'
import { Runbooks } from './runbooks/Runbooks'
import { NavigationContext } from './navigation/Submenu'
import { useRef } from 'react'
import { Tooltip } from './utils/Tooltip'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'
const APP_ICON = `${process.env.PUBLIC_URL}/console-full.png`

export function Icon({icon, text, selected, path, onClick, size}) {
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
      height={size || SIDEBAR_ICON_HEIGHT}
      width={size || SIDEBAR_ICON_HEIGHT}
      hoverIndicator='sidebarHover'
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick ? onClick() : history.push(path)}
      background={selected ? 'sidebarHover' : null}
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


export default function Console() {
  const [open, setOpen] = useState(false)

  return (
    <EnsureLogin>
      <InstallationsProvider>
      <NavigationContext>
      <BreadcrumbProvider>
        <Box width='100vw' height='100vh'>
          <AutoRefresh />
          <Box flex={false} direction='row' align='center' background='backgroundDark' height={TOOLBAR_HEIGHT}
                 border={{side: 'bottom', color: 'sidebarBorder'}}>
            <Box flex={false} direction='row' align='center'>
              <img height='50px' alt='' src={APP_ICON} />
            </Box>
            <Breadcrumbs />
            <Box direction='row' fill gap='small' justify='end' 
                  pad={{horizontal: 'medium'}} align='center'>
              <Icon
                icon={<Explore size='18px' />}
                text='Search'
                size='40px'
                selected={open}
                onClick={() => setOpen(true)} />
              <Installations />
            </Box>
            {open && <Installer setOpen={setOpen} />}
          </Box>
          <Box fill direction='row'>
            <Sidebar />
            <Box fill direction='row'>
              <Switch>
                <Route path='/config/:repo' component={Configuration} />
                <Route path='/config' render={() => (
                  <RepositorySelector
                    prefix='config'
                    title='Configuration'
                    description='edit configuration for your installed repos' />
                )} />
                <Route path='/directory/:section' component={Directory} />
                <Route exact path='/directory'>
                  <Redirect to='/directory/users' />
                </Route>
                <Route path='/logs/:repo' component={LogViewer} />
                <Route path='/incident/:incidentId' component={withPluralApi(Incident)} />
                <Route path='/incidents' component={withPluralApi(Incidents)} />
                <Route path='/logs' render={() => (
                  <RepositorySelector
                    prefix='logs'
                    title='Logs'
                    description='aggregated logstreams for your repos' />
                )} />
                <Route path='/pods/:namespace/:name' component={Pod} />
                <Route path='/runbooks/:namespace/:name' component={Runbook} />
                <Route path='/runbooks/:repo' component={Runbooks} />
                <Route path='/nodes/:name' component={Node} />
                <Route path='/nodes' component={Nodes} />
                <Route path='/audits/:graph' component={Audits} />
                <Route exact path='/audits'>
                  <Redirect to='/audits/table' />
                </Route>
                <Route path='/components/:repo/:kind/:name' component={Component} />
                <Route path='/components/:repo' component={Application} />
                <Route path='/components' render={() => (
                  <RepositorySelector
                    prefix='components'
                    title='Components'
                    description='details for all your applications' />
                )} />
                <Route path='/build/:buildId' component={Build} />
                <Route path='/webhooks' component={Webhooks} />
                <Route path='/dashboards/:repo' component={Dashboards} />
                <Route path='/dashboards' render={() => (
                  <RepositorySelector
                    prefix='dashboards'
                    title='Dashboards'
                    description='view monitoring dashboards for installed repos' />
                )} />
                <Route path='/me/edit' component={EditUser} />
                <Route path='/users' component={Users} />
                <Route path='/' component={Builds} />
              </Switch>
              <InstallationsFlyout />
            </Box>
          </Box>
        </Box>
      </BreadcrumbProvider>
      </NavigationContext>
      </InstallationsProvider>
    </EnsureLogin>
  )
}