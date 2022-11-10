import React, { useContext, useRef, useState } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import { Box, Text } from 'grommet'
import { useHistory } from 'react-router'

import { Install } from 'forge-core'

import { Portal } from 'react-portal'

import Foco from 'react-foco'

import { Next } from 'grommet-icons'

import ConsoleSidebar, { SIDEBAR_ICON_HEIGHT } from './ConsoleSidebar'
import Builds from './Builds'
import Build from './Build'
import BreadcrumbProvider, { Breadcrumbs } from './Breadcrumbs'
import Webhooks from './Webhooks'
import Configuration from './Configuration'
import Dashboards from './Dashboards'
import { EnsureLogin } from './Login'
import { LoginContext } from './contexts'

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
import { Audits } from './audits/Audits'
import { withPluralApi } from './PluralApi'
import { Incidents } from './incidents/Incidents'
import { Incident } from './incidents/Incident'
import { Installer } from './repos/Installer'
import { Runbook } from './runbooks/Runbook'
import { Runbooks } from './runbooks/Runbooks'
import { NavigationContext } from './navigation/Submenu'
import { Tooltip } from './utils/Tooltip'

import { Notifications } from './users/Notifications'
import { PodShell } from './terminal/PodShell'
import { AutoRefresh } from './AutoRefresh'
import Apps from './apps/Apps.tsx'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'
const APP_ICON = `${process.env.PUBLIC_URL}/console-full.png`

export function Icon({ icon, text, selected, path, onClick, size, align }) {
  const dropRef = useRef()
  const history = useHistory()
  const [hover, setHover] = useState(false)

  return (
    <>
      <Box
        ref={dropRef}
        focusIndicator={false}
        className={`sidebar-icon${selected ? ' selected' : ''}`}
        align="center"
        justify="center"
        margin={{ horizontal: 'xsmall' }}
        round="xsmall"
        height={size || SIDEBAR_ICON_HEIGHT}
        width={size || SIDEBAR_ICON_HEIGHT}
        hoverIndicator="sidebarHover"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onClick ? onClick() : history.push(path)}
        background={selected ? 'sidebarHover' : null}
        direction="row"
      >
        {icon}
      </Box>
      {hover && (
        <Tooltip
          pad="small"
          round="xsmall"
          justify="center"
          background="sidebarHover" 
          target={dropRef}
          side="right"
          align={align || { left: 'right' }}
          margin="xsmall"
        >
          <Text
            size="small"
            weight={500}
          >{text}
          </Text>
        </Tooltip>
      )}
    </>
  )
}

const FlyoutContext = React.createContext({})

function FlyoutProvider({ children }) {
  const [ref, setRef] = useState(false)

  return (
    <FlyoutContext.Provider value={{ ref, setRef }}>
      {children}
    </FlyoutContext.Provider>
  )
}

function FlyoutGutter() {
  const { setRef } = useContext(FlyoutContext)

  return (
    <Box 
      height="100%" 
      background="backgroundColor" 
      ref={setRef} 
      flex={false}
      style={{ overflow: 'auto' }}
    />
  )
}

function FocoComponent({ children, ...props }) {
  return (
    <Box
      {...props}
      fill="vertical"
      flex={false}
    >
      {children}
    </Box>
  )
}

export function FlyoutContainer({ width, header, close, modifier, children }) {
  const { ref } = useContext(FlyoutContext)

  return (
    <Portal node={ref}>
      <Foco
        onClickOutside={close}
        component={FocoComponent}
      >
        <Box
          flex={false}
          width={width || '400px'}
          fill="vertical"
          background="backgroundColor" 
          border={{ side: 'left' }}
        >
          <Box
            flex={false}
            pad={{ horizontal: 'small', vertical: 'xsmall' }}
            gap="small"
            align="center"
            direction="row"
            border={{ side: 'bottom' }}
          >
            <Box fill="horizontal">
              <Text
                size="small"
                weight={500}
              >{header}
              </Text>
            </Box>
            {modifier}
            <Box
              flex={false}
              pad="xsmall"
              round="xsmall"
              hoverIndicator="card"
              onClick={close}
            >
              <Next size="14px" />
            </Box>
          </Box>
          <Box
            fill
            style={{ overflow: 'auto' }}
            background="backgroundColor"
          >
            {children}
          </Box>
        </Box>
      </Foco>
    </Portal>
  )
}

function DemoBanner() {
  const { configuration } = useContext(LoginContext)

  if (!configuration.isDemoProject) return null

  return (
    <Box
      direction="row"
      fill="horizontal"
      pad={{ vertical: 'small' }}
      justify="center"
      background="card"
      border={{ color: 'orange', size: '3px', side: 'top' }}
    >
      <Box
        flex={false}
        direction="row"
        gap="xsmall"
        align="center"
      >
        <Text
          size="small"
          color="tone-medium"
        >You are currently deployed on a plural demo GCP project, which will expire 6 hours after creation.  If you'd like to deploy on your own cloud, visit
        </Text>
        <a
          href="https://docs.plural.sh/quickstart/getting-started"
          target="_blank"
          rel="noopener noreferrer"
        >here
        </a>
      </Box>
    </Box>
  )
}

export default function Console() {
  const [open, setOpen] = useState(false)

  return (
    <EnsureLogin>
      <FlyoutProvider>
        <InstallationsProvider>
          <NavigationContext>
            <BreadcrumbProvider>
              <Box
                width="100vw"
                height="100vh"
              >
                <DemoBanner />
                <Box
                  flex={false}
                  direction="row"
                  align="center"
                  background="backgroundDark"
                  height={TOOLBAR_HEIGHT}
                  border={{ side: 'bottom', color: 'sidebarBorder' }}
                >
                  <Box
                    flex={false}
                    direction="row"
                    align="center"
                  >
                    <img
                      height="50px"
                      alt=""
                      src={APP_ICON}
                    />
                  </Box>
                  <Breadcrumbs />
                  <Box
                    direction="row"
                    fill
                    gap="xsmall"
                    justify="end" 
                    pad={{ horizontal: 'medium' }}
                    align="center"
                  >
                    <AutoRefresh />
                    <Icon
                      icon={<Install size="18px" />}
                      text="Install"
                      size="40px"
                      selected={open}
                      align={{ top: 'bottom' }}
                      onClick={() => setOpen(true)}
                    />
                    <Notifications />
                    <Installations />
                  </Box>
                  {open && <Installer setOpen={setOpen} />}
                </Box>
                <Box
                  fill
                  direction="row"
                >
                  <ConsoleSidebar />
                  <Box
                    fill
                    direction="row"
                  >
                    <Switch>
                      <Route
                        path="/config/:repo"
                        component={Configuration}
                      />
                      <Route
                        path="/config"
                        render={() => (
                          <RepositorySelector
                            prefix="config"
                            title="Configuration"
                            description="edit configuration for your installed repos"
                          />
                        )}
                      />
                      <Route
                        path="/directory/:section"
                        component={Directory}
                      />
                      <Route
                        exact
                        path="/directory"
                      >
                        <Redirect to="/directory/users" />
                      </Route>
                      <Route
                        path="/logs/:repo"
                        component={LogViewer}
                      />
                      <Route
                        path="/incident/:incidentId"
                        component={withPluralApi(Incident)}
                      />
                      <Route
                        path="/incidents"
                        component={withPluralApi(Incidents)}
                      />
                      <Route
                        path="/logs"
                        render={() => (
                          <RepositorySelector
                            prefix="logs"
                            title="Logs"
                            description="aggregated logstreams for your repos"
                          />
                        )}
                      />
                      <Route
                        path="/pods/:namespace/:name"
                        component={Pod}
                      />
                      <Route
                        path="/runbooks/:namespace/:name"
                        component={Runbook}
                      />
                      <Route
                        path="/runbooks/:repo"
                        component={Runbooks}
                      />
                      <Route
                        path="/nodes/:name"
                        component={Node}
                      />
                      <Route
                        path="/nodes"
                        component={Nodes}
                      />
                      <Route
                        path="/audits/:graph"
                        component={Audits}
                      />
                      <Route
                        exact
                        path="/audits"
                      >
                        <Redirect to="/audits/table" />
                      </Route>
                      <Route
                        path="/components/:repo/:kind/:name"
                        component={Component}
                      />
                      <Route
                        path="/components/:repo"
                        component={Application}
                      />
                      <Route
                        path="/components"
                        render={() => (
                          <RepositorySelector
                            prefix="components"
                            title="Components"
                            description="details for all your applications"
                          />
                        )}
                      />
                      <Route
                        path="/build/:buildId"
                        component={Build}
                      />
                      <Route
                        path="/webhooks"
                        component={Webhooks}
                      />
                      <Route
                        path="/dashboards/:repo"
                        component={Dashboards}
                      />
                      <Route
                        path="/dashboards"
                        render={() => (
                          <RepositorySelector
                            prefix="dashboards"
                            title="Dashboards"
                            description="view monitoring dashboards for installed repos"
                          />
                        )}
                      />
                      <Route
                        path="/me/edit"
                        component={EditUser}
                      />
                      <Route
                        path="/users"
                        component={Users}
                      />
                      <Route
                        path="/shell/pod/:namespace/:name/:container"
                        component={PodShell}
                      />
                      <Route
                        path="/builds"
                        component={Builds}
                      />
                      <Route
                        path="/"
                        component={Apps}
                      />
                    </Switch>
                    <FlyoutGutter />
                  </Box>
                </Box>
              </Box>
            </BreadcrumbProvider>
          </NavigationContext>
        </InstallationsProvider>
      </FlyoutProvider>
    </EnsureLogin>
  )
}
