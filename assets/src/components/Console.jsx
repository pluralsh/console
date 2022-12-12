import React, { useContext, useRef, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { Box, Text } from 'grommet'

import { Portal } from 'react-portal'

import Foco from 'react-foco'

import { Next } from 'grommet-icons'

import ConsoleSidebar, { SIDEBAR_ICON_HEIGHT } from './ConsoleSidebar'
import Builds from './builds/Builds'
import Build from './builds/build/Build'
import BreadcrumbProvider from './Breadcrumbs'
import Webhooks from './Webhooks'
import Configuration from './Configuration'
import { EnsureLogin } from './Login'

import Users from './Users'
import { InstallationsProvider } from './Installations'
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
import { NavigationContext } from './navigation/Submenu'
import { Tooltip } from './utils/Tooltip'

import { PodShell } from './terminal/PodShell'
import Apps from './apps/Apps'
import App from './apps/app/App'
import ConsoleHeader from './ConsoleHeader'
import ConsoleSubheader from './ConsoleSubheader'
import Dashboards from './apps/app/dashboards/Dashboards'
import Runbooks from './apps/app/runbooks/Runbooks'
import CostAnalysis from './apps/app/cost/CostAnalysis'
import Dashboard from './apps/app/dashboards/dashboard/Dashboard'
import Runbook from './apps/app/runbooks/runbook/Runbook'
import Logs from './apps/app/logs/Logs'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

export function Icon({
  icon, text, selected, path, onClick, size, align,
}) {
  const dropRef = useRef()
  const navigate = useNavigate()
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
        onClick={() => (onClick ? onClick() : navigate(path))}
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
                  >
                    <ConsoleSubheader />
                    <Box
                      fill
                      direction="row"
                      overflow="auto"
                    >
                      <Routes>
                        <Route
                          path="/config/:repo"
                          element={<Configuration />}
                        />
                        <Route
                          path="/config"
                          element={(
                            <RepositorySelector
                              prefix="config"
                              title="Configuration"
                              description="edit configuration for your installed repos"
                            />
                          )}
                        />
                        <Route
                          path="/directory/:section"
                          element={<Directory />}
                        />
                        <Route
                          exact
                          path="/directory"
                          element={(
                            <Navigate
                              replace
                              to="/directory/users"
                            />
                          )}
                        />
                        <Route
                          path="/incident/:incidentId"
                          element={<PluralApi><Incident /></PluralApi>}
                        />
                        {/* <Route path="/incidents">
                          <PluralApi><Incidents /></PluralApi>
                        </Route> */}
                        {/* Disabled for now.  */}
                        <Route
                          path="/pods/:namespace/:name"
                          element={<Pod />}
                        />
                        <Route
                          path="/nodes/:name"
                          element={<Node />}
                        />
                        <Route
                          path="/nodes"
                          element={<Nodes />}
                        />
                        <Route
                          path="/audits/:graph"
                          element={<Audits />}
                        />
                        <Route
                          exact
                          path="/audits"
                          element={(
                            <Navigate
                              replace
                              to="/audits/table"
                            />
                          )}
                        />
                        <Route
                          path="/components/:repo/:kind/:name"
                          element={<Component />}
                        />
                        <Route
                          path="/components/:repo"
                          element={<Application />}
                        />
                        <Route
                          path="/components"
                          element={(
                            <RepositorySelector
                              prefix="components"
                              title="Components"
                              description="details for all your applications"
                            />
                          )}
                        />
                        <Route
                          path="/builds/:buildId"
                          element={<Build />}
                        />
                        <Route
                          path="/webhooks"
                          element={<Webhooks />}
                        />
                        <Route
                          path="/dashboards"
                          element={(
                            <RepositorySelector
                              prefix="dashboards"
                              title="Dashboards"
                              description="view monitoring dashboards for installed repos"
                            />
                          )}
                        />
                        <Route
                          path="/me/edit"
                          element={<EditUser />}
                        />
                        <Route
                          path="/users"
                          element={<Users />}
                        />
                        <Route
                          path="/shell/pod/:namespace/:name/:container"
                          element={<PodShell />}
                        />
                        <Route
                          path="/builds"
                          element={<Builds />}
                        />
                        <Route
                          path="/apps/:appName"
                          element={<App />}
                        >
                          <Route
                            index
                            element={(
                              <Navigate
                                replace
                                to="dashboards"
                              />
                            )}
                          />
                          <Route
                            path="dashboards"
                            element={<Dashboards />}
                          />
                          <Route
                            path="dashboards/:dashboardId"
                            element={<Dashboard />}
                          />
                          <Route
                            path="runbooks"
                            element={<Runbooks />}
                          />
                          <Route
                            path="runbooks/:runbookName"
                            element={<Runbook />}
                          />
                          <Route
                            path="logs"
                            element={<Logs />}
                          />
                          <Route
                            path="cost"
                            element={<CostAnalysis />}
                          />
                        </Route>
                        <Route
                          path="/"
                          element={<Apps />}
                        />
                      </Routes>
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
