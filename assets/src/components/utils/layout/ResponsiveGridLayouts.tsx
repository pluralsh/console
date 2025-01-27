// alternative to the ResponsiveLayout components for when grid makes more sense

import { ReactNode } from 'react'
import styled, { CSSObject, DefaultTheme } from 'styled-components'

function gridLayoutWithSideNavStyle(
  theme: DefaultTheme,
  hideSidecar: boolean = true
): CSSObject {
  return {
    display: 'grid',
    gridTemplateColumns: hideSidecar ? '240px 1fr' : '240px 1fr 200px',
    ...(hideSidecar && {
      [`@media (min-width: ${theme.breakpoints.desktop}px)`]: {
        gridTemplateColumns: '240px 1fr 200px',
      },
    }),
    columnGap: theme.spacing.xlarge,
    rowGap: theme.spacing.large,
  }
}

export const GridLayoutWithSideNav = styled.div<{
  $hideSidecar?: boolean
}>(({ theme, $hideSidecar = true }) => ({
  ...gridLayoutWithSideNavStyle(theme, $hideSidecar),
  gridTemplateRows: '64px 1fr',
  padding: theme.spacing.large,
  paddingLeft: theme.spacing.small,
  height: '100%',
  overflow: 'hidden',
}))

export const GridHeaderWithSideNav = styled.header<{
  $hideSidecar?: boolean
}>(({ theme, $hideSidecar = true }) => ({
  // takes up the whole row but internally has the same three-column logic
  gridColumn: '1 / -1',
  ...gridLayoutWithSideNavStyle(theme, $hideSidecar),
}))

export function GridTableWrapper({ children }: { children: ReactNode }) {
  // this is kinda hacky to make the table fit on the page correctly
  // needs to be in a flex container
  // should revisit at some point
  return (
    <div css={{ flex: 1, position: 'relative' }}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          position: 'absolute',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}
