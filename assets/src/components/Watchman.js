import React from 'react'
import { Switch, Route } from 'react-router-dom'
import { Box } from 'grommet'
import Sidebar from './Sidebar'
import Builds from './Builds'
import Build from './Build'
import BreadcrumbProvider, { Breadcrumbs } from './Breadcrumbs'
import Webhooks from './Webhooks'
import Configuration from './Configuration'
import Dashboards from './Dashboards'
import { EnsureLogin } from './Login'
import Users from './Users'
import { Installations, InstallationsProvider } from './Installations'
import { LogViewer } from './Logs'
import RepositorySelector from './RepositorySelector'
import Application from './Application'
import Component from './kubernetes/Component'
import { Node, Nodes } from './kubernetes/Node'
import { Pod } from './kubernetes/Pod'
import Directory from './users/Directory'
import EditUser from './users/EditUser'

const SIDEBAR_WIDTH = '70px'

export default function Watchman() {
  return (
    <EnsureLogin>
      <InstallationsProvider>
      <BreadcrumbProvider>
        <Box direction='row' width='100vw' height='100vh'>
          <Box width={SIDEBAR_WIDTH}>
            <Sidebar />
          </Box>
          <Box height='100vh' width='100%'>
            <Box flex={false} direction='row' align='center' background='backgroundDark' height='45px'>
              <Breadcrumbs />
              <Box direction='row' fill justify='end' pad={{horizontal: 'medium'}}>
                <Installations />
              </Box>
            </Box>
            <Switch>
              <Route path='/config/:repo' component={Configuration} />
              <Route path='/config' render={() => (
                <RepositorySelector
                  prefix='config'
                  title='Configuration'
                  description='edit configuration for your installed repos' />
              )} />
              <Route path='/directory/:section' component={Directory} />
              <Route path='/directory' component={Directory} />
              <Route path='/logs/:repo' component={LogViewer} />
              <Route path='/logs' render={() => (
                <RepositorySelector
                  prefix='logs'
                  title='Logs'
                  description='aggregated logstreams for your repos' />
              )} />
              <Route path='/pods/:namespace/:name' component={Pod} />
              <Route path='/nodes/:name' component={Node} />
              <Route path='/nodes' component={Nodes} />
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
          </Box>
        </Box>
      </BreadcrumbProvider>
      </InstallationsProvider>
    </EnsureLogin>
  )
}