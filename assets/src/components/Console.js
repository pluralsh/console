import React, { useState } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import { Box } from 'grommet'
import Sidebar, { SidebarIcon } from './Sidebar'
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
import { Search } from 'grommet-icons'
import { Installer } from './repos/Installer'

const SIDEBAR_WIDTH = '70px'

export default function Console() {
  const [open, setOpen] = useState(false)

  return (
    <EnsureLogin>
      <InstallationsProvider>
      <BreadcrumbProvider>
        <Box direction='row' width='100vw' height='100vh'>
          <AutoRefresh />
          <Box width={SIDEBAR_WIDTH}>
            <Sidebar />
          </Box>
          <Box height='100vh' width='100%'>
            <Box flex={false} direction='row' align='center' background='backgroundDark' height='55px'>
              <Breadcrumbs />
              <Box direction='row' fill gap='small' justify='end' 
                   pad={{horizontal: 'medium'}} align='center'>
                <SidebarIcon
                  icon={<Search size='18px' />}
                  text='Search'
                  size='40px'
                  selected={open}
                  onClick={() => setOpen(true)} />
                <Installations />
              </Box>
              {open && <Installer setOpen={setOpen} />}
            </Box>
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
                <Route path='/nodes/:name' component={Node} />
                <Route path='/nodes' component={Nodes} />
                <Route path='/audits' component={Audits} />
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
      </InstallationsProvider>
    </EnsureLogin>
  )
}