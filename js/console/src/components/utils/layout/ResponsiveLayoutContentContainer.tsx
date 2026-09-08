import styled from 'styled-components'

export const RESPONSIVE_LAYOUT_CONTENT_WIDTH = 896

export const ResponsiveLayoutContentContainer = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  flexShrink: 1,
  height: '100%',
  maxHeight: '100%',
  width: RESPONSIVE_LAYOUT_CONTENT_WIDTH,
  maxWidth: RESPONSIVE_LAYOUT_CONTENT_WIDTH,
  overflowY: 'auto',
  overflowX: 'hidden',
})
