import React, { useContext, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Box, Text } from 'grommet'
import { Portal } from 'react-portal'
import Foco from 'react-foco'
import { Next } from 'grommet-icons'

import ConsoleSidebar, { SIDEBAR_ICON_HEIGHT } from './ConsoleSidebar'
import BreadcrumbProvider from './Breadcrumbs'
import { EnsureLogin } from './Login'
import { InstallationsProvider } from './Installations'
import { Tooltip } from './utils/Tooltip'
import ConsoleHeader from './ConsoleHeader'
import ConsoleSubheader from './ConsoleSubheader'
import TerminalThemeProvider from './terminal/TerminalThemeProvider'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'
export function Icon({
  icon, text, selected, path, onClick, size, align,
}) {
  const dropRef = useRef<any>()
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
        background={selected ? 'sidebarHover' : undefined}
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
          >
            {text}
          </Text>
        </Tooltip>
      )}
    </>
  )
}

const FlyoutContext = React.createContext<any>({})

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
              >
                {header}
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
          <BreadcrumbProvider>
            <TerminalThemeProvider>
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
                      <Outlet />
                      <FlyoutGutter />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </TerminalThemeProvider>
          </BreadcrumbProvider>
        </InstallationsProvider>
      </FlyoutProvider>
    </EnsureLogin>
  )
}
