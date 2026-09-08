import styled from 'styled-components'

import { mqs } from './Breakpoints'

export const PageGrid = styled.div((_p) => ({
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
  maxWidth: 1588,
  marginLeft: 'auto',
  marginRight: 'auto',
  position: 'relative',
}))

export const SideNavContainer = styled.div(({ theme }) => ({
  display: 'none',
  [mqs.twoColumn]: {
    display: 'block',
    flex: '0 0 300px',
    marginRight: 'auto',
    marginLeft: theme.spacing.large,
  },
}))

export const SideCarContainer = styled.div(({ theme }) => ({
  display: 'none',

  [mqs.threeColumn]: {
    position: 'sticky',
    marginRight: theme.spacing.large,
    top: 'var(--top-nav-height)',
    bottom: 0,
    maxHeight: 'calc(100vh - var(--top-nav-height))',
    flex: '0 0 200px',
    display: 'block',
  },
}))

export const ContentContainer = styled.main(({ theme }) => ({
  flex: '1 1',
  marginRight: theme.spacing.large,
  marginLeft: theme.spacing.large,
  // Don't remove this min width, or it will paradoxically allow
  // the content to stretch wider than the flex container
  minWidth: '100px',
  [mqs.threeColumn]: {
    maxWidth: 896,
    marginRight: theme.spacing.xlarge,
    marginLeft: theme.spacing.xlarge,
  },
}))
