import styled from 'styled-components'

import { mqs } from './Breakpoints'

export const PageGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  width: '100%',
  minHeight: 'calc(100vh - var(--top-nav-height))',
  [mqs.twoColumn]: {
    gridTemplateColumns: 'var(--docs-sidenav-width) minmax(0, 1fr)',
  },
})

export const SideNavContainer = styled.div(({ theme }) => ({
  display: 'none',
  [mqs.twoColumn]: {
    display: 'block',
    minWidth: 0,
    backgroundColor: theme.colors['fill-one'],
  },
}))

export const MainColumn = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  minWidth: 0,
  width: '100%',
  padding: `0 ${theme.spacing.large}px`,
  [mqs.twoColumn]: {
    padding: `0 ${theme.spacing.xlarge}px`,
  },
  [mqs.maxWidth]: {
    padding: '0 64px',
  },
}))

export const SideCarContainer = styled.div(({ theme }) => ({
  display: 'none',

  [mqs.threeColumn]: {
    position: 'sticky',
    top: 'var(--top-nav-height)',
    alignSelf: 'flex-start',
    flex: '0 0 var(--docs-sidecar-width)',
    width: 'var(--docs-sidecar-width)',
    maxHeight: 'calc(100vh - var(--top-nav-height))',
    overflow: 'auto',
    display: 'block',
    marginLeft: theme.spacing.xlarge,
  },
}))

export const ContentContainer = styled.main<{ $wide?: boolean }>(
  ({ theme, $wide }) => ({
    flex: '1 1 auto',
    minWidth: 0,
    width: '100%',
    padding: `${theme.spacing.medium}px 0 ${theme.spacing.xxxlarge}px`,
    ...(!$wide
      ? {
          maxWidth: 896,
          [mqs.threeColumn]: {
            maxWidth: 960,
          },
          [mqs.maxWidth]: {
            maxWidth: 1120,
          },
        }
      : {
          maxWidth: 1120,
          [mqs.maxWidth]: {
            maxWidth: 1280,
          },
        }),
  })
)
