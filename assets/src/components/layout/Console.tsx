import { Outlet } from 'react-router-dom'
import { Box } from 'grommet'

import { Toast } from '@pluralsh/design-system'

import { A, Span } from 'honorable'

import { EnsureLogin } from '../Login'
import { InstallationsProvider } from '../Installations'

import TerminalThemeProvider from '../terminal/TerminalThemeProvider'

import { CursorPositionProvider } from '../utils/CursorPosition'

import BreadcrumbProvider from './Breadcrumbs'

import Header from './Header'
import Subheader from './Subheader'

import Sidebar from './Sidebar'
import WithApplicationUpdate from './WithApplicationUpdate'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

export default function Console() {
  const isProduction = import.meta.env.MODE === 'production'

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
                {isProduction && (
                  <WithApplicationUpdate>
                    {({ reloadApplication }) => (
                      <>test
                        <Toast
                          severity="info"
                          marginBottom="medium"
                          marginRight="xxxxlarge"
                        >
                          <Span marginRight="small">Time for a new update!</Span>
                          <A
                            onClick={() => reloadApplication()}
                            style={{ textDecoration: 'none' }}
                            color="action-link-inline"
                          >
                            Update now
                          </A>
                        </Toast>
                      </>
                    )}
                  </WithApplicationUpdate>
                )}
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
