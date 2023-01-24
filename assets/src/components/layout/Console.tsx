import { Outlet } from 'react-router-dom'
import { Box } from 'grommet'

import BreadcrumbProvider from '../Breadcrumbs'
import { EnsureLogin } from '../Login'
import { InstallationsProvider } from '../Installations'

import TerminalThemeProvider from '../terminal/TerminalThemeProvider'

import { CursorPositionProvider } from '../utils/CursorPosition'

import Header from './Header'
import Subheader from './Subheader'

import Sidebar from './Sidebar'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

export default function Console() {
  return (
    <CursorPositionProvider>
      <EnsureLogin>
        <InstallationsProvider>
          <BreadcrumbProvider>
            <TerminalThemeProvider>
              <Box
                width="100vw"
                height="100vh"
              >
                <Header />
                <Box
                  fill
                  direction="row"
                >
                  <Sidebar />
                  <Box
                    fill
                    direction="column"
                  >
                    <Subheader />
                    <Box
                      fill
                      direction="row"
                      overflow="auto"
                    >
                      <Outlet />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </TerminalThemeProvider>
          </BreadcrumbProvider>
        </InstallationsProvider>
      </EnsureLogin>
    </CursorPositionProvider>
  )
}
