import React, { useContext, useRef, useState } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import { Box, Text } from 'grommet'
import { useHistory } from 'react-router'

import { Portal } from 'react-portal'

import Foco from 'react-foco'

import { Next } from 'grommet-icons'

import ConsoleSidebar, { SIDEBAR_ICON_HEIGHT } from './ConsoleSidebar'
import Builds from './Builds'
import Build from './Build'
import BreadcrumbProvider from './Breadcrumbs'
import Webhooks from './Webhooks'
import Configuration from './Configuration'
import Dashboards from './Dashboards'
import { EnsureLogin } from './Login'

import Users from './Users'
import { InstallationsProvider } from './Installations'
import { LogViewer } from './Logs'
import RepositorySelector from './RepositorySelector'
import Application from './Application'
import Component from './kubernetes/Component'
import { Node, Nodes } from './kubernetes/Node'
import { Pod } from './kubernetes/Pod'
import Directory from './users/Directory'
import EditUser from './users/EditUser'
import { Audits } from './audits/Audits'
import { PluralApi } from './PluralApi'
import { Incident } from './incidents/Incident'
import { Runbook } from './runbooks/Runbook'
import { Runbooks } from './runbooks/Runbooks'
import { NavigationContext } from './navigation/Submenu'
import { Tooltip } from './utils/Tooltip'

import { PodShell } from './terminal/PodShell'
import Apps from './apps/Apps'
import App from './app/App'
import ConsoleHeader from './ConsoleHeader'
import ConsoleSubheader from './ConsoleSubheader'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

export function Icon({
  icon, text, selected, path, onClick, size, align,
}) {
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
        onClick={() => (onClick ? onClick() : history.push(path))}
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
    // eslint-disable-next-line react/jsx-no-constructed-context-values
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

export function FlyoutContainer({
  width, header, close, modifier, children,
}) {
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

export default function Console() {
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
                <ConsoleHeader />
                <Box
                  fill
                  direction="row"
                >
                  <ConsoleSidebar />
                  <Box
                    fill
                    direction="column"
                    overflow="auto"
                  >
                    <ConsoleSubheader />
                    <Box
                      fill
                      direction="row"
                      overflow="auto"
                    >

                      <Switch>
                        <Route path="/config/:repo">
                          <Configuration />
                        </Route>
                        <Route
                          path="/config"
                        >
                          <RepositorySelector
                            prefix="config"
                            title="Configuration"
                            description="edit configuration for your installed repos"
                          />
                        </Route>
                        <Route path="/directory/:section">
                          <Directory />
                        </Route>
                        <Route
                          exact
                          path="/directory"
                        >
                          <Redirect to="/directory/users" />
                        </Route>
                        <Route path="/logs/:repo">
                          <LogViewer />
                        </Route>
                        <Route path="/incident/:incidentId">
                          <PluralApi><Incident /></PluralApi>
                        </Route>
                        {/* <Route
                          path="/incidents"
                        >
                          <PluralApi><Incidents /></PluralApi>
                        </Route> */}
                        {/* Disabled for now.  */}
                        <Route path="/logs">
                          <RepositorySelector
                            prefix="logs"
                            title="Logs"
                            description="aggregated logstreams for your repos"
                          />
                        </Route>
                        <Route path="/pods/:namespace/:name">
                          <Pod />
                        </Route>
                        <Route path="/runbooks/:namespace/:name">
                          <Runbook />
                        </Route>
                        <Route path="/runbooks/:repo">
                          <Runbooks />
                        </Route>
                        <Route path="/nodes/:name">
                          <Node />
                        </Route>
                        <Route path="/nodes">
                          <Nodes />
                        </Route>
                        <Route path="/audits/:graph">
                          <Audits />
                        </Route>
                        <Route
                          exact
                          path="/audits"
                        >
                          <Redirect to="/audits/table" />
                        </Route>
                        <Route path="/components/:repo/:kind/:name">
                          <Component />
                        </Route>
                        <Route
                          path="/components/:repo"
                        >
                          <Application />
                        </Route>
                        <Route path="/components">
                          <RepositorySelector
                            prefix="components"
                            title="Components"
                            description="details for all your applications"
                          />
                        </Route>
                        <Route path="/builds/:buildId">
                          <Build />
                        </Route>
                        <Route path="/webhooks">
                          <Webhooks />
                        </Route>
                        <Route path="/dashboards/:repo">
                          <Dashboards />
                        </Route>
                        <Route path="/dashboards">
                          <RepositorySelector
                            prefix="dashboards"
                            title="Dashboards"
                            description="view monitoring dashboards for installed repos"
                          />
                        </Route>
                        <Route path="/me/edit">
                          <EditUser />
                        </Route>
                        <Route path="/users">
                          <Users />
                        </Route>
                        <Route path="/shell/pod/:namespace/:name/:container">
                          <PodShell />
                        </Route>
                        <Route path="/builds">
                          <Builds />
                        </Route>
                        <Route path="/app/:name">
                          <App />
                        </Route>
                        <Route path="/">
                          <Apps />
                        </Route>
                      </Switch>
                      <FlyoutGutter />
                    </Box>
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
